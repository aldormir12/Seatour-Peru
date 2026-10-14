package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tokens_revocados", indexes = @Index(name = "idx_tokens_revocados_expira", columnList = "expira_en"))
public class TokenRevocado {
    @Id @Column(length = 64, nullable = false)
    private String huella;
    @Column(name = "expira_en", nullable = false)
    private Instant expiraEn;
    protected TokenRevocado() {}
}
