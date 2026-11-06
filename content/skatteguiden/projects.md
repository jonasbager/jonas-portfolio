# Jonas Bager - Projects

## Slack AI Agent (on-prem GPU)

Built a multi-user AI agent running on an on-premises GPU server, integrated with Slack. Key design decisions:

- **Multi-user isolation:** Each user's context is strictly separated. An admin cannot read HR data belonging to another user. The agent enforces this at the routing layer, not just by convention.
- **Key management:** API keys and credentials are held by the IT lead, not embedded in the agent or accessible to end users. Rotation happens without touching the agent code.
- **On-prem hosting:** Keeps data inside the company's own infrastructure. The GPU runs inference locally; no data leaves the building for processing.

This was built to demonstrate that AI tooling inside a company can be both useful and governed - not a shadow-IT experiment that bypasses security controls.

---

## MCP Server with OAuth / IdentityServer + Copilot Studio

Built a Model Context Protocol (MCP) server that exposes enterprise data to AI assistants in a controlled, authenticated way.

- **Authentication:** OAuth 2.0 via IdentityServer. Every request is authenticated against the company's identity provider. No anonymous access.
- **Copilot Studio integration:** Connected to Microsoft Copilot Studio in M365, letting staff ask questions about internal data through a familiar interface without needing direct database access.
- **Scoped access:** The MCP server enforces what each identity is allowed to retrieve. The AI assistant can only surface what the requesting user is already authorised to see.

Demonstrates the pattern of giving AI tools a proper identity and access model, rather than bolting on a chatbot with broad database read access.

---

## AI Support Bot on Jira

Built an AI bot that handles IT support ticket triage and response, integrated with Jira.

- **Ticket ingestion:** The bot reads incoming support tickets, categorises them, drafts responses for common issues, and escalates the ones that need a human.
- **PII handling:** The bot is designed to avoid logging or processing personal data beyond what's needed to answer the ticket. PII fields are stripped before they reach the model.
- **Bus factor mitigation:** The bot encodes institutional knowledge (common fixes, escalation paths, vendor contacts) so the IT function isn't dependent on one person's memory. New team members have a starting point.
- **Stability:** The bot has a fallback path - if the AI response doesn't meet a confidence threshold, it queues for human review rather than sending a low-quality auto-reply.

---

## Home Lab

Runs a full home lab for learning, testing, and self-hosted services:

- **Hypervisor:** Proxmox VE - multiple VMs and LXC containers for isolated environments
- **Network:** UniFi stack - managed switches, access points, VLANs for network segmentation
- **Remote access:** Tailscale for zero-trust remote access without exposing ports
- **Home automation:** Home Assistant for smart home automation, integrated with the network layer

The home lab is used to test configurations before rolling them out to clients or employers, and to stay current with infrastructure tooling. No internal hostnames, IP ranges, or client-facing services are shared here.

---

## AI Products Shipped

Three commercial AI products built and shipped:

- **Captain:** AI bookkeeping agent. Conversation-based interface instead of a dashboard - users describe transactions and the agent handles categorisation and accounting logic.
- **Synthedo:** Creative testing with AI synthetic personas. Test marketing assumptions against AI-generated user archetypes before spending on real research or campaigns.
- **DashDoggo:** Meta Ads dashboard that makes complex performance data legible. Built for non-technical users who need to understand what their ad spend is doing.
