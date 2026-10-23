# KnowledgeOS Enterprise Test Data — IT Acceptable Use Policy

| Field | Value |
| --- | --- |
| **Version** | 3.2 |
| **Classification** | INTERNAL - ALL EMPLOYEES |
| **Effective Date** | March 1, 2024 |
| **Last Reviewed** | February 15, 2024 |
| **Document Owner** | Chief Information Security Officer |
| **Review Cycle** | Annual |
| **Regulatory References** | GDPR Art. 32, SOC 2 CC6.1, ISO 27001 A.8.1, NIST 800-53 AC-20 |

---

## 1. Purpose & Scope

This policy defines acceptable and unacceptable use of TechGlobal Solutions Inc. ("Company") information technology resources. It applies to all employees, contractors, consultants, temporaries, and third parties with access to Company systems, networks, data, or facilities ("Users").

Resources covered include but are not limited to:

- Computing devices: Laptops, desktops, mobile devices, servers, IoT devices
- Network infrastructure: LAN, WAN, VPN, Wi-Fi, SD-WAN, 5G
- Cloud services: AWS, Azure, GCP, SaaS applications (Salesforce, Workday, Slack, etc.)
- Communication systems: Email, Teams/Slack, Zoom, VoIP, SMS
- Data: All Company data regardless of storage location
- Accounts: User IDs, service accounts, API keys, certificates

## 2. General Principles

### 2.1 Business Purpose Primary

Company IT resources are provided for business purposes. Incidental personal use is permitted provided it:

- Does not interfere with job performance
- Does not consume excessive resources (bandwidth, storage, compute)
- Does not violate any policy or law
- Does not create security risk or reputational harm

### 2.2 No Expectation of Privacy

Users have no reasonable expectation of privacy in any data created, stored, sent, or received on Company systems. The Company reserves the right to monitor, access, review, copy, disclose, or delete any data at any time, with or without notice, subject to applicable law.

### 2.3 Compliance with Laws & Contracts

All use must comply with applicable laws (including export controls, sanctions, data protection) and contractual obligations (customer agreements, vendor licenses, NDAs).

## 3. Acceptable Use

### 3.1 Authorized Activities

- Performing assigned job duties
- Accessing approved business applications and data
- Communicating with colleagues, customers, partners for business purposes
- Professional development (approved training, certifications)
- Limited personal use per Section 2.1

### 3.2 Approved Software & Services

- Only software from the Approved Software Catalog (ServiceNow) may be installed
- Cloud services require Cloud Security Assessment (CSA) approval
- Browser extensions require IT Security review
- AI/ML tools: Only approved enterprise accounts (no PII/confidential data in public models)

### 3.3 Remote Access

- Company-managed devices only (MDM-enrolled)
- Always-on VPN (GlobalProtect) required for corporate resource access
- Split-tunneling disabled; all traffic inspected
- MFA required for all remote access (hardware token or authenticator app)

## 4. Unacceptable Use

### 4.1 Security Violations

- Attempting to bypass, disable, or circumvent security controls (AV, EDR, DLP, firewall, MDM)
- Unauthorized vulnerability scanning, penetration testing, or network reconnaissance
- Installing unauthorized software, rootkits, keyloggers, or monitoring tools
- Sharing credentials, API keys, MFA tokens, or using another's account
- Disabling encryption, screen locks, or automatic updates
- Connecting unauthorized devices to corporate network (rogue APs, personal IoT)

### 4.2 Data Protection Violations

- Storing CONFIDENTIAL/RESTRICTED data on unapproved services (personal cloud, USB, local unencrypted)
- Transmitting sensitive data via unencrypted channels (HTTP, FTP, personal email)
- Downloading customer data to personal devices
- Using production data in non-production environments without anonymization
- Sharing credentials for service accounts or automated processes

### 4.3 Illegal & Harmful Activities

- Copyright infringement (unlicensed software, media, fonts)
- Accessing illegal content (CSAM, extremist material, dark web markets)
- Harassment, bullying, discrimination via Company systems
- Cryptocurrency mining or unauthorized compute workloads
- Participating in DDoS, botnets, or cybercrime
- Export control violations (sharing controlled tech with foreign persons)

### 4.4 Resource Abuse

- Excessive bandwidth: Streaming 4K video, large personal downloads, P2P/torrent
- Excessive storage: Personal media libraries, backups, VM images on corporate shares
- Unauthorized servers/services: Hosting websites, game servers, databases
- Automation abuse: Scraping, excessive API calls, credential stuffing tools

### 4.5 AI/ML Specific Restrictions

- No PII, PHI, CONFIDENTIAL, or RESTRICTED data in public AI models (ChatGPT, Claude, Gemini, Copilot Free)
- No source code upload to public models without Code Security review
- Approved: GitHub Copilot Enterprise, Amazon CodeWhisperer Pro, Azure OpenAI (Company tenant)
- All AI-generated code requires human review before production deployment

## 5. Email & Communications

### 5.1 Email Use

- Company email for business; minimal personal use
- No auto-forwarding to personal accounts
- Encryption required for CONFIDENTIAL/RESTRICTED data (Office 365 Message Encryption)
- Phishing: Report to phish@techglobal.com; do not click links or reply

### 5.2 Instant Messaging (Slack/Teams)

- Business channels: Professional conduct; no sensitive data in public channels
- Private channels/DMs: Not private — subject to monitoring and legal hold
- Retention: 90 days default; legal hold overrides
- Bots/integrations: Require Security review; no unauthorized webhooks

### 5.3 Video Conferencing

- Company-approved platforms only (Zoom Enterprise, Teams)
- Meeting passwords/waiting rooms required for external participants
- Recording: Explicit consent required (legal requirement in CA, EU, others)
- No recording of sensitive meetings without Legal approval

## 6. Device Management

### 6.1 Company-Issued Devices

- Standard build: Windows 11 Enterprise / macOS managed / iOS/Android MDM
- Full disk encryption: BitLocker / FileVault / Android/iOS encryption
- EDR agent mandatory (CrowdStrike/SentinelOne)
- Automatic updates: OS patches within 14 days (critical: 48 hours)
- No local admin rights (standard user); elevation via approved workflow

### 6.2 Mobile Device Management (MDM)

- Required for all devices accessing corporate email/data
- Capabilities: Remote wipe, encryption enforcement, app allow/block, compliance checks
- Personal devices: BYOD container separation; Company can wipe corporate container only
- Jailbroken/rooted devices: Blocked from corporate resources

### 6.3 Lost/Stolen Devices

- Report immediately: IT ServiceNow + security@techglobal.com
- Remote wipe initiated within 1 hour of report
- Police report required for stolen devices (insurance/forensics)
- Replacement: Next business day (standard models)

## 7. Cloud & Infrastructure

### 7.1 Cloud Resource Provisioning

- All cloud resources via IaC (Terraform) in approved GitOps pipeline
- No console-based resource creation (except break-glass with audit)
- Tagging mandatory: Owner, CostCenter, Environment, DataClassification, Application
- Drift detection: Daily scans; auto-remediation for critical findings

### 7.2 Container & Kubernetes

- Images: Signed, scanned (Trivy/Snyk), from approved registries only
- Runtime: Falco/Tracee monitoring; no privileged containers without exception
- Secrets: Vault/SealedSecrets only; no secrets in images, configmaps, or git

### 7.3 SaaS Applications

- New SaaS: CSA questionnaire + Legal review + Security architecture review
- SSO required (SAML/OIDC via Okta); no local accounts
- SCIM provisioning preferred; quarterly access reviews
- Data processing addendum (DPA) required for all processors

## 8. Software Development

### 8.1 Source Code Management

- GitHub Enterprise (Company org) only; no personal repos for Company code
- Branch protection: Required reviews (2), status checks, signed commits
- Secrets scanning: Push protection enabled; TruffleHog/GitGuardian
- Dependabot/Renovate: Auto-merge for patch; manual for minor/major

### 8.2 CI/CD Pipeline

- Build: Reproducible, hermetic, signed artifacts (cosign/sigstore)
- Test: Unit, integration, contract, SAST, DAST, SCA, container scan
- Deploy: Progressive (canary/blue-green); feature flags; automated rollback
- Production: Change advisory board (CAB) for high-risk; emergency break-glass

### 8.3 Open Source

- Approved licenses: MIT, Apache-2.0, BSD-3, ISC (auto-approved)
- Restricted: GPL, AGPL, SSPL, BSL (Legal review required)
- Contributions: CLA required; no Company IP without approval
- SBOM: Generated for all releases (SPDX/CycloneDX)

## 9. Incident Response

### 9.1 Reporting

- Security incidents: security@techglobal.com or #security-incident (Slack)
- Phishing: phish@techglobal.com (forward suspicious emails)
- Lost credentials: Immediate password reset + MFA re-enrollment
- Data exposure: Legal + Privacy + Security notified within 1 hour

### 9.2 User Responsibilities During Incident

- Preserve evidence: Do not reboot, delete files, or run cleanup tools
- Cooperate with IR team: Provide access, logs, timeline
- No public disclosure without Communications + Legal approval
- Post-incident: Complete lessons learned; implement remediation

## 10. Monitoring & Enforcement

### 10.1 Monitoring Scope

- Network traffic (full packet capture at perimeter)
- Endpoint telemetry (process, network, file, registry)
- Email/DLP: Content inspection for data classification patterns
- Cloud: CloudTrail, VPC flow logs, GuardDuty, Security Hub
- Identity: Okta logs, AD audit, privileged access sessions (recorded)

### 10.2 Data Retention

- Security logs: 13 months hot, 7 years cold (S3 Glacier/Blob Archive)
- Email: 7 years (legal hold extends indefinitely)
- Slack/Teams: 90 days default; legal hold extends
- Endpoint telemetry: 90 days hot, 1 year cold

### 10.3 Enforcement Actions

- Level 1 (Minor): Automated block/quarantine + user education
- Level 2 (Moderate): Manager notification + formal warning + additional training
- Level 3 (Serious): Access revocation + HR investigation + potential termination
- Level 4 (Critical): Immediate suspension + legal/law enforcement referral

### 10.4 Appeals

- Written appeal to CISO within 10 business days
- Review by CISO + HR + Legal within 15 business days
- Decision final; documented in personnel file

## 11. Exceptions & Waivers

### 11.1 Exception Process

- Business justification + risk assessment + compensating controls
- Approval: CISO (security), CIO (operational), Legal (regulatory)
- Maximum duration: 1 year; quarterly review required
- Documented in GRC platform (RSA Archer/ServiceNow GRC)

### 11.2 Emergency Exceptions

- Verbal approval from CISO/CIO + written confirmation within 24 hours
- Maximum 72 hours; full exception process must follow

## 12. Training & Awareness

### 12.1 Mandatory Training

- Annual Security Awareness (45 min): Phishing, social engineering, data handling, incident reporting
- Role-based: Secure coding (developers), Cloud security (engineers), Privacy (HR/Finance/Legal)
- New hire: Within 30 days of start date
- Compliance: 95% completion required; tied to bonus eligibility

### 12.2 Phishing Simulations

- Monthly simulated campaigns
- Click/credential entry: Automated training assignment (15 min)
- Repeat offenders (3+ in 12 months): Manager notification + enhanced training
- No punitive action for reporting real or simulated phishing

## 13. Related Policies & Documents

- Information Classification & Handling Policy
- Data Retention & Disposal Policy
- Incident Response Plan
- Business Continuity & Disaster Recovery Plan
- Vendor Security Assessment Policy
- Cryptographic Controls Standard
- Network Security Standard
- Endpoint Security Standard
- Identity & Access Management Policy
- Privacy Policy (External)

## 14. Definitions

- **CSA:** Cloud Security Assessment
- **DLP:** Data Loss Prevention
- **EDR:** Endpoint Detection and Response
- **IaC:** Infrastructure as Code
- **MDM:** Mobile Device Management
- **MFA:** Multi-Factor Authentication
- **PII:** Personally Identifiable Information
- **PHI:** Protected Health Information
- **PIP:** Performance Improvement Plan
- **SBOM:** Software Bill of Materials
- **SCA:** Software Composition Analysis
- **SAST:** Static Application Security Testing
- **DAST:** Dynamic Application Security Testing
- **SOC:** Security Operations Center
- **VPN:** Virtual Private Network

## 15. Revision History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 3.2 | 2024-03-01 | CISO Office | Added AI/ML restrictions, updated cloud standards, refined BYOD |
| 3.1 | 2023-09-15 | CISO Office | Added SaaS governance, container security, SBOM requirements |
| 3.0 | 2023-03-01 | CISO Office | Major rewrite: Zero Trust alignment |
| 2.5 | 2022-06-10 | InfoSec Team | Added remote work provisions |

---

**END OF DOCUMENT**
