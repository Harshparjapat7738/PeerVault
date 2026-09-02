package com.peervault.transfer;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.DeviceStatus;
import com.peervault.common.dto.DeviceType;
import com.peervault.common.dto.NatType;
import com.peervault.common.dto.OsType;
import com.peervault.common.dto.P2PInitiateResponseDto;
import com.peervault.common.dto.RelayStatusDto;
import com.peervault.common.dto.RelayUploadResponseDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.TransferMode;
import com.peervault.common.dto.TransferStatus;
import com.peervault.common.dto.TransferTaskDto;
import com.peervault.transfer.client.DeviceClient;
import com.peervault.transfer.client.FileClient;
import com.peervault.transfer.web.dto.RelayUploadMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Real integration test for both transfer modes — Testcontainers Mongo + Kafka, real
 * {@code TransferTask} persistence, real GridFS byte storage for relay mode (Task 6). Requires a
 * running Docker daemon (see {@code ShareFlowIntegrationTest}'s javadoc in share-service).
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransferModesIntegrationTest {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer(DockerImageName.parse("mongo:7"));

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", () -> mongo.getReplicaSetUrl("transfer_test"));
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @MockBean
    private DeviceClient deviceClient;
    @MockBean
    private FileClient fileClient;

    @BeforeEach
    void stubDevices() {
        when(deviceClient.getDevice(eq("device-A"))).thenReturn(device("device-A"));
        when(deviceClient.getDevice(eq("device-B"))).thenReturn(device("device-B"));
    }

    @Test
    void p2pInitiateNegotiatesThenTransfersOnAnswer() {
        StorageFileDto file = new StorageFileDto("file-1", "device-A", "root-1", "/data", "video.mp4",
                "video.mp4", "mp4", 1_000_000L, "2026-01-01 00:00:00", "abc123", "video/mp4", false, false, false,
                null, null, null, 1, null);
        when(fileClient.getFile(eq("file-1"))).thenReturn(file);

        ResponseEntity<P2PInitiateResponseDto> initiateResponse = restTemplate.postForEntity(
                "/api/v1/transfers/p2p/initiate",
                new HttpEntity<>(new InitiateBody("file-1", "device-B")),
                P2PInitiateResponseDto.class);
        assertThat(initiateResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String transferId = initiateResponse.getBody().transferId();

        assertThat(taskById(transferId).status()).isEqualTo(TransferStatus.NEGOTIATING);
        assertThat(taskById(transferId).mode()).isEqualTo(TransferMode.P2P_DIRECT);

        ResponseEntity<Void> offerResponse = restTemplate.postForEntity(
                "/api/v1/transfers/p2p/" + transferId + "/offer", new HttpEntity<>(new OfferBody("v=0...offer")), Void.class);
        assertThat(offerResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);

        ResponseEntity<Void> answerResponse = restTemplate.postForEntity(
                "/api/v1/transfers/p2p/" + transferId + "/answer", new HttpEntity<>(new AnswerBody("v=0...answer")), Void.class);
        assertThat(answerResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);

        // The answer is what flips NEGOTIATING -> TRANSFERRING (see P2PSignalingService.relayAnswer).
        assertThat(taskById(transferId).status()).isEqualTo(TransferStatus.TRANSFERRING);
    }

    @Test
    void relayUploadStoresRealBytesAndDownloadReturnsThemByteForByte() {
        byte[] content = "hello relay world — real GridFS round trip".getBytes(StandardCharsets.UTF_8);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        HttpHeaders filePartHeaders = new HttpHeaders();
        filePartHeaders.setContentType(MediaType.TEXT_PLAIN);
        ByteArrayResource fileResource = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return "hello.txt";
            }
        };
        body.add("file", new HttpEntity<>(fileResource, filePartHeaders));

        HttpHeaders metaPartHeaders = new HttpHeaders();
        metaPartHeaders.setContentType(MediaType.APPLICATION_JSON);
        body.add("metadata", new HttpEntity<>(new RelayUploadMetadata("device-A", "device-B", "hello.txt", "text/plain"), metaPartHeaders));

        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

        ResponseEntity<RelayUploadResponseDto> uploadResponse = restTemplate.postForEntity(
                "/api/v1/transfers/relay/upload", new HttpEntity<>(body, requestHeaders), RelayUploadResponseDto.class);
        assertThat(uploadResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String transferId = uploadResponse.getBody().transferId();
        assertThat(uploadResponse.getBody().relayUrl()).contains(transferId);

        RelayStatusDto statusAfterUpload = restTemplate.getForObject("/api/v1/transfers/relay/" + transferId + "/status", RelayStatusDto.class);
        assertThat(statusAfterUpload.uploadComplete()).isTrue();
        assertThat(statusAfterUpload.downloadAvailable()).isTrue();
        assertThat(statusAfterUpload.sizeBytes()).isEqualTo(content.length);

        ResponseEntity<byte[]> downloadResponse = restTemplate.exchange(
                "/api/v1/transfers/relay/" + transferId + "/download", HttpMethod.POST, HttpEntity.EMPTY, byte[].class);
        assertThat(downloadResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        // The point of this test: what comes back is byte-for-byte what was actually uploaded, not
        // a simulated/fabricated response — real GridFS storage and retrieval, not mocked.
        assertThat(downloadResponse.getBody()).isEqualTo(content);

        RelayStatusDto statusAfterDownload = restTemplate.getForObject("/api/v1/transfers/relay/" + transferId + "/status", RelayStatusDto.class);
        assertThat(statusAfterDownload.status()).isEqualTo(TransferStatus.COMPLETED);
    }

    private TransferTaskDto taskById(String id) {
        List<TransferTaskDto> tasks = restTemplate.exchange("/api/v1/transfers", HttpMethod.GET, null,
                new ParameterizedTypeReference<List<TransferTaskDto>>() {
                }).getBody();
        return tasks.stream().filter(t -> t.id().equals(id)).findFirst().orElseThrow();
    }

    private DeviceDto device(String id) {
        return new DeviceDto(id, "Device " + id, DeviceType.LAPTOP, OsType.LINUX, "1.0.0", DeviceStatus.ONLINE,
                "fingerprint-" + id, "10.0.0.1", NatType.FULL_CONE, "2026-01-01 00:00:00", null, null, 0L, 0L,
                List.of(), List.of(), 0, true, null, "2026-01-01 00:00:00", null, null);
    }

    private record InitiateBody(String fileId, String targetDeviceId) {
    }

    private record OfferBody(String sdpOffer) {
    }

    private record AnswerBody(String sdpAnswer) {
    }
}
