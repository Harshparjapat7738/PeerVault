package com.peervault.transfer.util;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.function.LongConsumer;

/**
 * Wraps a relay upload's source stream so it gets genuinely real, non-simulated chunked progress:
 * every read is capped at {@code chunkSizeBytes} (so GridFS's own internal copy loop — which
 * decides how much to request per call — never batches more than one logical "chunk" into a single
 * invocation), hashed incrementally into a running digest, and reported via the callback as bytes
 * are actually read, before GridFS ever persists them. Nothing here is simulated: the callback only
 * ever fires for bytes that were really read from the real source stream.
 */
public final class ChunkedProgressInputStream extends FilterInputStream {

    private final MessageDigest digest;
    private final int chunkSizeBytes;
    private final LongConsumer onBytesRead;
    private long totalRead;

    public ChunkedProgressInputStream(InputStream in, MessageDigest digest, int chunkSizeBytes, LongConsumer onBytesRead) {
        super(in);
        this.digest = digest;
        this.chunkSizeBytes = chunkSizeBytes;
        this.onBytesRead = onBytesRead;
    }

    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        int capped = Math.min(len, chunkSizeBytes);
        int read = super.read(b, off, capped);
        if (read > 0) {
            digest.update(b, off, read);
            totalRead += read;
            onBytesRead.accept(totalRead);
        }
        return read;
    }

    @Override
    public int read() throws IOException {
        int b = super.read();
        if (b != -1) {
            digest.update((byte) b);
            totalRead++;
            onBytesRead.accept(totalRead);
        }
        return b;
    }

    public long totalRead() {
        return totalRead;
    }
}
