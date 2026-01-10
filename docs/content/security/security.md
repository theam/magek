---
title: "Security Overview"
group: "Security"
---

# Security

Magek accepts standard [JWT tokens](https://jwt.io/) to authenticate incoming requests.
Likewise, you can use the claims included in these tokens to authorize access to commands
or read models by using the provided simple role-based authorization or writing your own
authorizer functions.

## Security Topics

- [Authentication](01_authentication.md) - How to authenticate users
- [Authorization](02_authorization.md) - How to authorize access to resources
