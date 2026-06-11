erDiagram

    User {
        UUID id PK
        VARCHAR email UK
        VARCHAR hashed_password
        ENUM role "ADMIN | DEPOSITOR | APPROVER"
        TIMESTAMP created_at
    }

    Report {
        UUID id PK
        VARCHAR title
        VARCHAR type
        ENUM priority "LOW | MEDIUM | HIGH | CRITICAL"
        TIMESTAMP activation_date
        TIMESTAMP reminder_date
        TIMESTAMP due_date
        BOOLEAN is_active
        ENUM status "PENDING | APPROVED | REJECTED | TO_REDO | CANCELED"
        UUID depositor_id FK
        UUID current_version_id FK
        TIMESTAMP created_at
    }

    ReportVersion {
        UUID id PK
        UUID report_id FK
        INTEGER version_number
        VARCHAR file_path
        TIMESTAMP uploaded_at
    }

    ReportAuditLog {
        UUID id PK
        UUID report_id FK
        UUID actor_id FK
        VARCHAR action
        VARCHAR from_status
        VARCHAR to_status
        TEXT comment
        JSON metadata
        TIMESTAMP created_at
    }

    ReportComment {
        UUID id PK
        UUID report_id FK
        UUID version_id FK "nullable"
        UUID author_id FK
        UUID parent_comment_id FK "nullable"
        TEXT content
        BOOLEAN is_deleted DEFAULT false
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    Notification {
        UUID id PK
        UUID user_id FK
        VARCHAR type
        TEXT message
        BOOLEAN is_read
        TIMESTAMP created_at
    }

    User ||--o{ Report : depositor
    User ||--o{ ReportAuditLog : actor
    User ||--o{ ReportComment : author
    User ||--o{ Notification : user

    Report ||--o{ ReportVersion : versions
    Report ||--o{ ReportAuditLog : audit_logs
    Report ||--o{ ReportComment : comments

    ReportVersion ||--o{ ReportComment : version_comments

    ReportComment ||--o{ ReportComment : replies

    Report |o--o| ReportVersion : current_version