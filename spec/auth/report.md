# Evaluation of Web Authentication Models for Aromix Platform

**Date:** 2026-05-14\
**Status:** Research & Design Phase

---

## Executive Summary

We have systematically evaluated several web authentication models – from traditional sessions and JWTs to modern DPoP, counter‑based schemes, idempotency keys, and WebAuthn. Each model was assessed against the core requirements of **tamper‑proofing**, **replay attack resistance**, **scalability**, and **cross‑browser stability**.

The central unsolved problem remains: **any credential that must be stored or transmitted to the client can be stolen, replayed, or spoofed**, unless the client is equipped with hardware‑bound key storage (e.g., TPM/secure enclave).

Below we summarise the models examined, their identified flaws, and the current architectural dead‑ends.

---

## 1. Traditional Session Cookies (HttpOnly)

| Pros                                                     | Cons                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Simple, widely supported, HttpOnly prevents XSS reading. | Session ID can be stolen via network interception or malware.  |
| No client‑side crypto needed.                            | Stolen cookie allows full impersonation until session expires. |
|                                                          | Server must maintain session state (can be scaled with Redis). |

**Identified flaw:** The session ID is a bearer token – once stolen, it can be replayed from any machine. No binding to a specific client or request.

**Conclusion:** Insufficient for high‑risk operations without additional layers.

---

## 2. JSON Web Tokens (JWT) in HttpOnly Cookie

| Pros                          | Cons                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| Stateless, no server storage. | Token theft gives attacker full access until expiry (hours/days). |
| Easy to implement.            | Revocation requires token blacklist (adds state).                 |

**Identified flaw:** Same as sessions – bearer token problem. Worse, long expiration windows amplify damage.

**Conclusion:** Not tamper‑proof; only marginally better than sessions.

---

## 3. DPoP (Demonstration of Proof of Possession) + Web Crypto

| Pros                                                            | Cons                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Binds token to a client‑generated, non‑extractable private key. | Private key is stored in IndexedDB and **can be extracted from disk** (extractable: false only prevents JS export, not filesystem read).         |
| Server stores only public key.                                  | Requires Web Crypto API – stable, but key extraction vulnerability remains.                                                                      |
| DPoP proof includes path + timestamp, limiting replay window.   | **Replay within window** (e.g., 30s) still possible.                                                                                             |
|                                                                 | **Dropped request attack:** Attacker intercepts and drops original request, then replays proof → server accepts because counter not incremented. |

**Identified flaw:**

- Client‑side key material is not hardware‑protected → can be stolen by malware reading IndexedDB files.
- Counter‑based schemes fail when request is dropped before reaching server.
- Short expiry (1‑5s) reduces but does not eliminate replay risk.

**Conclusion:** Better than bearer tokens, but insufficient for financial operations without additional safeguards.

---

## 4. Counter‑Based Replay Protection

| Approach                                                    | Flaw                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Client increments a counter, server stores last seen value. | If request is dropped on the wire, attacker can replay the same counter value because server never saw the original – server accepts. |
| Server stores used nonces in a cache.                       | Works, but requires server state. Not stateless.                                                                                      |

**Identified flaw:** The dropped‑request attack is fundamental: without client‑side confirmation of receipt, the server cannot distinguish between a legitimate retry and an attacker’s replay.

---

## 5. Idempotency Keys (Industry Standard for Payments)

| Pros                                                             | Cons                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Client sends a unique UUID per state‑changing request.           | Requires server cache (e.g., Redis) to store used keys – minimal state.                              |
| Guarantees exactly‑once execution, even under retries or replay. | Does not prevent theft of the session cookie itself – still need a primary authentication mechanism. |
| Proven in payment systems (Stripe, PayPal).                      |                                                                                                      |

**Identified flaw:** Idempotency keys solve duplicate processing but do **not** authenticate the request – they must be layered on top of a secure session.

**Conclusion:** Required for financial operations, but must be combined with a strong primary auth (e.g., WebAuthn).

---

## 6. WebAuthn / Passkeys

| Pros                                               | Cons                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Hardware‑bound private key (TPM / Secure Enclave). | **Authentication only** – not designed to sign every API request in a session. |
| Phishing‑resistant (origin binding).               | Requires user interaction for each login.                                      |
| Stable, cross‑browser standard (W3C).              |                                                                                |

**Identified flaw:** After successful WebAuthn login, we still need a session token for subsequent requests. That session token reintroduces the bearer token vulnerability.

**Conclusion:** Excellent for initial authentication, but does not solve the session replay problem unless combined with a **server‑side session** that is short‑lived and tightly bound to the hardware authenticator (which is not yet standard).

---

## 7. Emerging Hardware‑Bound Session Proposals

| Standard                                    | Status                                          | Availability                  |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------- |
| **DBSC (Device Bound Session Credentials)** | Chrome Beta, IETF draft                         | Not stable, not cross‑browser |
| **PADIT**                                   | Early research                                  | Experimental                  |
| **mTLS with client certificates**           | Deprecated for public web (CAs no longer issue) | Dead end                      |

**Identified flaw:** No production‑ready, cross‑browser solution exists that cryptographically binds a web session to a specific device’s hardware.

**Conclusion:** The ideal solution (hardware‑bound session) is not yet available for production web apps.

---

## Current Stuck Point

We are stuck at a **fundamental limitation of the web platform**:

> **Any credential that must be sent from client to server to prove authenticity can be intercepted, replayed, or spoofed by an attacker who controls the network or the client machine.**
>
> The only known mitigation – hardware‑bound session keys (DBSC) – is not yet stable or cross‑browser.

### Remaining Unsolved Risks

1. **Replay of dropped requests:**\
   A request that never reaches the server (due to network drop or intentional interception) can be replayed by the attacker before the client retries, and the server cannot distinguish it from a legitimate first attempt without an idempotency key. Idempotency keys solve duplicate processing but not the authentication of the request itself.

2. **Extractable client‑side keys:**\
   Even with `extractable: false` in Web Crypto, the key material is stored unencrypted in the browser’s IndexedDB and can be read by malware with filesystem access. True hardware protection is required.

3. **Session token after WebAuthn:**\
   After a strong WebAuthn login, we must issue a session token (cookie) for subsequent requests. That token is again a bearer credential, vulnerable to theft. Shortening its lifetime reduces risk but does not eliminate it.

---

## Proposed Way Forward (For Senior Review)

We need to decide on a **practical trade‑off** based on risk tolerance and operational constraints. Three viable paths:

### Path A: **Idempotency + Server Sessions (Minimal State)**

- Use WebAuthn for login.
- Issue short‑lived (e.g., 15 min) server‑side session cookies.
- For every state‑changing request (payments, orders), require an **Idempotency-Key** header stored in Redis (24h TTL).
- Accept that session cookie theft allows only a 15 min window of impersonation – mitigated by requiring re‑authentication (WebAuthn) for high‑value actions.

### Path B: **DPoP + Short Expiry + Idempotency**

- Keep DPoP with 5‑second expiry to reduce replay window.
- Add idempotency keys for financial ops.
- Accept the risk of stolen client‑side keys from IndexedDB (low probability for most users).

### Path C: **Wait for DBSC**

- Do nothing new. Stick with classic session cookies + WebAuthn login.
- Plan to adopt DBSC when it becomes stable and cross‑browser (likely 2027–2028).

**Recommendation:** Path A – it uses only stable, cross‑browser technologies, shifts risk to a short session window, and leverages idempotency to exactly‑once guarantee for money movements. The remaining risk (session cookie theft) is mitigated by requiring re‑authentication for sensitive actions.

---

## Appendix: Flaws Summary Table

| Model                       | Bearer Token?        | Replay Protection              | Hardware Binding | Cross‑Browser    | Production Ready |
| --------------------------- | -------------------- | ------------------------------ | ---------------- | ---------------- | ---------------- |
| Session Cookie              | Yes (session ID)     | No                             | No               | Yes              | Yes              |
| JWT                         | Yes                  | No                             | No               | Yes              | Yes              |
| DPoP + Web Crypto           | No                   | Limited (window)               | No (key on disk) | Yes (Web Crypto) | Yes              |
| DPoP + Counter              | No                   | Partial (request drop flaw)    | No               | Yes              | Yes              |
| DPoP + Idempotency          | No                   | Yes (for duplicate processing) | No               | Yes              | Yes              |
| WebAuthn (login only)       | No (auth only)       | Yes (challenge)                | Yes (hardware)   | Yes              | Yes              |
| WebAuthn + Server Session   | Yes (session cookie) | No                             | No (after login) | Yes              | Yes              |
| DBSC (device‑bound session) | No                   | Yes                            | Yes              | No (Chrome only) | No               |

---

## Next Steps

Please review the above and advise on the acceptable risk level for the Aromix platform. Once approved, we will proceed with implementing **Path A** (WebAuthn login + short server sessions + idempotency keys) as the production baseline while monitoring the maturity of DBSC for future hardening.
