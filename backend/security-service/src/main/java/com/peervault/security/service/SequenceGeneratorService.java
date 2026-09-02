package com.peervault.security.service;

import com.peervault.security.domain.Counter;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * MongoDB atomic-counter pattern: hands out monotonically increasing sequence numbers for the audit
 * ledger via an atomic {@code findAndModify}, safe under concurrent Kafka listener threads.
 */
@Service
public class SequenceGeneratorService {

    private static final String AUDIT_LOG_COUNTER_ID = "audit_logs";

    private final MongoOperations mongoTemplate;

    public SequenceGeneratorService(MongoOperations mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public long nextAuditSeq() {
        Query query = Query.query(Criteria.where("_id").is(AUDIT_LOG_COUNTER_ID));
        Update update = new Update().inc("seq", 1);
        FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true).upsert(true);
        Counter counter = mongoTemplate.findAndModify(query, update, options, Counter.class);
        return counter.getSeq();
    }
}
