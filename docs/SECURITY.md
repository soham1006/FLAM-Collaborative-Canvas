# Security & Input Validation Architecture

## 1. Threat Modeling & Mitigation Matrix

| Threat / Attack Vector | Risk Level | Mitigation Architecture |
| :--- | :--- | :--- |
| **WebSocket Message Flooding (DoS)** | High | In-memory token-bucket rate limiter (`ConnectionManager`) enforcing a ceiling of **60 messages/sec** per socket. Connections exceeding limits receive warning errors or are disconnected. |
| **Oversized Payloads (Memory Exhaustion)** | High | Fastify WebSocket `maxPayload` set to **1 MB** (`WS_MAX_PAYLOAD_BYTES`). Packets exceeding this size are rejected at the network framing layer before JSON parsing, while client-side Ramer-Douglas-Peucker (RDP) simplifies freehand paths to keep typical payloads under 5–10 KB. |
| **Malformed JSON & Schema Poisoning** | High | Every inbound WebSocket and REST request is validated against strict **Zod schemas** (`packages/shared/src/validation.ts`). Non-conforming messages are dropped immediately. |
| **Cross-Site Scripting (XSS) via Canvas Text** | Medium | Text shapes render solely via the native Canvas `ctx.fillText()` API. No `innerHTML` or `dangerouslySetInnerHTML` is used. HTML characters are rendered literally as vector glyphs without executing scripts. |
| **SVG Export Injection** | Medium | When generating SVG export strings, special XML characters (`<`, `>`, `&`, `"`) in text shapes and labels are escaped to prevent malicious XML script injections. |
| **Cross-Origin Resource Sharing (CORS)** | Medium | Registered `@fastify/cors` with configurable origin validation (`CORS_ORIGIN`), preventing unauthorized cross-origin API invocation in production. |
| **SQL Injection** | Low | Persistence queries run through **Prisma ORM** which utilizes parameterized prepared statements, preventing SQL injection vulnerabilities. |
| **Secret Leakage** | Critical | No database credentials or API secrets are hardcoded in source. All sensitive variables are loaded via `.env` (excluded by `.gitignore`), with `.env.example` provided for reference. |
