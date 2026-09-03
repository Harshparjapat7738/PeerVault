package com.peervault.share;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.DeviceStatus;
import com.peervault.common.dto.DeviceType;
import com.peervault.common.dto.NatType;
import com.peervault.common.dto.OsType;
import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.ShareRequestDto;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.dto.SharedStorageOverviewDto;
import com.peervault.common.dto.ShareStatus;
import com.peervault.common.dto.ShareTransferMode;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.StorageRootDto;
import com.peervault.share.client.AuthClient;
import com.peervault.share.client.DeviceClient;
import com.peervault.share.client.FileClient;
import com.peervault.share.web.dto.ShareAcceptanceDto;
import com.peervault.share.web.dto.ShareRejectionDto;
import com.peervault.share.web.dto.ShareRequestCreateDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Real integration test: real Spring context, real MongoDB/Kafka/Redis (Testcontainers), real
 * controller/service/repository layers, real hash — the only things mocked are the outbound REST
 * clients to device-service/auth-service/file-service ({@code @MockBean}), which is the correct
 * boundary for testing one microservice in isolation (see backend/claude.md's Task 8 notes on why
 * this isn't a whole-mesh Testcontainers suite).
 * <p>
 * Requires a running Docker daemon — that's Testcontainers' whole model. If this doesn't launch
 * locally, start Docker Desktop (or point {@code DOCKER_HOST} at a remote daemon) first.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ShareFlowIntegrationTest {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer(DockerImageName.parse("mongo:7"));

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", () -> mongo.getReplicaSetUrl("share_test"));
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @MockBean
    private DeviceClient deviceClient;
    @MockBean
    private AuthClient authClient;
    @MockBean
    private FileClient fileClient;

    private static final String OWNER_USER = "user-A";
    private static final String OWNER_DEVICE = "device-A";
    private static final String ROOT_ID = "root-1";
    private static final String TARGET_USER = "user-B";
    private static final String TARGET_DEVICE = "device-B";

    @BeforeEach
    void stubDeviceLookups() {
        when(deviceClient.getDevice(eq(OWNER_DEVICE))).thenReturn(deviceWithRoot(OWNER_DEVICE, ROOT_ID));
        when(deviceClient.getDevice(eq(TARGET_DEVICE))).thenReturn(deviceWithRoot(TARGET_DEVICE, "irrelevant-root"));
    }

    @Test
    void createAcceptListAndPermissionEnforcement() {
        // 1. Create — as the owner, direct targetUserId (skips the AuthClient email-lookup path).
        ShareRequestCreateDto createBody = new ShareRequestCreateDto(
                OWNER_DEVICE, TARGET_USER, null, TARGET_DEVICE, ROOT_ID,
                List.of(SharePermission.READ), ShareTransferMode.DIRECT, "please review", null);
        ResponseEntity<ShareRequestDto> createResponse = post("/api/v1/share/request", createBody, OWNER_USER, ShareRequestDto.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ShareRequestDto created = createResponse.getBody();
        assertThat(created).isNotNull();
        assertThat(created.status()).isEqualTo(ShareStatus.PENDING);
        String requestId = created.id();

        // 2. Sent/received listings.
        List<ShareRequestDto> sent = getList("/api/v1/share/requests/sent", OWNER_USER);
        assertThat(sent).extracting(ShareRequestDto::id).contains(requestId);

        List<ShareRequestDto> received = getList("/api/v1/share/requests/received", TARGET_USER);
        assertThat(received).extracting(ShareRequestDto::id).contains(requestId);

        // 3. Accept — as the target, on their own device.
        ShareAcceptanceDto acceptBody = new ShareAcceptanceDto(TARGET_DEVICE, "sure, granted");
        ResponseEntity<SharedStorageDto> acceptResponse =
                post("/api/v1/share/request/" + requestId + "/accept", acceptBody, TARGET_USER, SharedStorageDto.class);
        assertThat(acceptResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        SharedStorageDto grant = acceptResponse.getBody();
        assertThat(grant).isNotNull();
        assertThat(grant.isActive()).isTrue();
        assertThat(grant.permissions()).containsExactly(SharePermission.READ);
        String sharedStorageId = grant.id();

        // 4. Overview shows up on both sides.
        SharedStorageOverviewDto targetOverview = restTemplate.exchange("/api/v1/share/storage", HttpMethod.GET,
                new HttpEntity<>(headersFor(TARGET_USER)), SharedStorageOverviewDto.class).getBody();
        assertThat(targetOverview).isNotNull();
        assertThat(targetOverview.sharedWithMe()).extracting(SharedStorageDto::id).contains(sharedStorageId);

        SharedStorageOverviewDto ownerOverview = restTemplate.exchange("/api/v1/share/storage", HttpMethod.GET,
                new HttpEntity<>(headersFor(OWNER_USER)), SharedStorageOverviewDto.class).getBody();
        assertThat(ownerOverview).isNotNull();
        assertThat(ownerOverview.sharedByMe()).extracting(SharedStorageDto::id).contains(sharedStorageId);

        // 5. READ-permitted list succeeds.
        StorageFileDto stubbedFile = new StorageFileDto("file-1", OWNER_DEVICE, ROOT_ID, "/data", "notes.txt",
                "notes.txt", "txt", 1024, "2026-01-01 00:00:00", "deadbeef", "text/plain", false, false, false,
                null, null, null, 1, null);
        when(fileClient.listFiles(eq(OWNER_DEVICE), eq(ROOT_ID))).thenReturn(List.of(stubbedFile));

        List<StorageFileDto> files = getList("/api/v1/share/storage/" + sharedStorageId + "/files", TARGET_USER);
        assertThat(files).extracting(StorageFileDto::id).containsExactly("file-1");

        // 6. A non-participant gets 403, not the file list.
        ResponseEntity<String> strangerAttempt = restTemplate.exchange(
                "/api/v1/share/storage/" + sharedStorageId + "/files", HttpMethod.GET,
                new HttpEntity<>(headersFor("user-C")), String.class);
        assertThat(strangerAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 7. Permission enforcement: READ-only grant, DELETE must be rejected (Task 8's explicit ask).
        when(fileClient.getFile(eq("file-1"))).thenReturn(stubbedFile);
        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                "/api/v1/share/storage/" + sharedStorageId + "/files/file-1", HttpMethod.DELETE,
                new HttpEntity<>(headersFor(TARGET_USER)), String.class);
        assertThat(deleteAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 8. Revoke — owner only.
        ResponseEntity<String> revokeByNonOwner = restTemplate.exchange(
                "/api/v1/share/storage/" + sharedStorageId, HttpMethod.DELETE,
                new HttpEntity<>(headersFor(TARGET_USER)), String.class);
        assertThat(revokeByNonOwner.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<SharedStorageDto> revokeByOwner = restTemplate.exchange(
                "/api/v1/share/storage/" + sharedStorageId, HttpMethod.DELETE,
                new HttpEntity<>(headersFor(OWNER_USER)), SharedStorageDto.class);
        assertThat(revokeByOwner.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(revokeByOwner.getBody()).isNotNull();
        assertThat(revokeByOwner.getBody().isActive()).isFalse();
    }

    @Test
    void rejectMarksRequestRejected() {
        ShareRequestCreateDto createBody = new ShareRequestCreateDto(
                OWNER_DEVICE, TARGET_USER, null, TARGET_DEVICE, ROOT_ID,
                List.of(SharePermission.READ, SharePermission.WRITE), ShareTransferMode.RELAY, null, null);
        ShareRequestDto created = post("/api/v1/share/request", createBody, OWNER_USER, ShareRequestDto.class).getBody();
        assertThat(created).isNotNull();

        ResponseEntity<ShareRequestDto> rejectResponse = post(
                "/api/v1/share/request/" + created.id() + "/reject",
                new ShareRejectionDto("not needed right now"), TARGET_USER, ShareRequestDto.class);
        assertThat(rejectResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rejectResponse.getBody()).isNotNull();
        assertThat(rejectResponse.getBody().status()).isEqualTo(ShareStatus.REJECTED);

        List<ShareRequestDto> received = getList("/api/v1/share/requests/received?status=rejected", TARGET_USER);
        assertThat(received).extracting(ShareRequestDto::id).contains(created.id());
    }

    private DeviceDto deviceWithRoot(String deviceId, String rootId) {
        StorageRootDto root = new StorageRootDto(rootId, "/data/" + rootId, "Test Root", false, true, 0, 0);
        return new DeviceDto(deviceId, "Device " + deviceId, DeviceType.LAPTOP, OsType.LINUX, "1.0.0",
                DeviceStatus.ONLINE, "fingerprint-" + deviceId, "10.0.0.1", NatType.FULL_CONE, "2026-01-01 00:00:00",
                null, null, 0L, 0L, List.of(root), List.of(), 0, true, null, "2026-01-01 00:00:00", null, null, "test-user");
    }

    private HttpHeaders headersFor(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId);
        return headers;
    }

    private <T> ResponseEntity<T> post(String path, Object body, String userId, Class<T> responseType) {
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headersFor(userId)), responseType);
    }

    private <T> List<T> getList(String path, String userId) {
        ResponseEntity<List<T>> response = restTemplate.exchange(path, HttpMethod.GET,
                new HttpEntity<>(headersFor(userId)), new ParameterizedTypeReference<List<T>>() {
                });
        return response.getBody();
    }
}
