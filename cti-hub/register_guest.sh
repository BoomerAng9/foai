#!/bin/bash
curl -s -X POST http://localhost:3080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Guest","username":"guest","email":"guest@acheevy.local","password":"AcheevyGuest2026","confirm_password":"AcheevyGuest2026"}'
