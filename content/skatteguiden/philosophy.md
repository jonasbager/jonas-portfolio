# Jonas Bager - Philosophy

## Agents do the work. Humans own the decisions.

AI agents are good at repetitive, rule-based tasks: provisioning accounts, checking compliance, triaging tickets, sending reminders. They're fast, consistent, and don't forget steps. But decisions that affect people - access grants, terminations, exceptions to policy - those stay with humans. Not because the agent can't make them, but because accountability matters. If something goes wrong, someone needs to own it, and that someone should be a person.

This isn't about distrust of AI. It's about designing systems that are auditable, correctable, and trustworthy enough to actually use.

---

## Every agent gets an identity, least-privilege access, an owner, and an offboarding date.

An agent that has access to everything, with no audit trail, that runs indefinitely - that's a liability. The same controls that apply to a service account apply to an AI agent:

- **Identity:** The agent has its own service principal. It's not running as a human user or a shared admin account.
- **Least-privilege:** The agent has exactly the permissions it needs to do its job, and no more. It can't read HR data to do IT work. It can't write to systems it only needs to read.
- **Audit trail:** Every action the agent takes is logged with a timestamp, the agent's identity, and the result. This isn't optional - it's how you know what happened when something goes wrong.
- **Offboarding date:** Agents don't run forever. When the project ends, the credential expires. This is set at creation, not remembered later.

This is what it means to run agents responsibly. It's also what it means to run IT responsibly - the patterns are the same.

---

## Start from yes.

IT exists to enable people, not to gatekeep them. When a colleague makes a request, the starting assumption is that there's a legitimate reason. The job is to find a way to say yes - safely, within policy, with the right controls in place.

Security comes from good controls: conditional access, MFA, audit logs, least-privilege. It doesn't come from saying no to everything. A culture of no slows the company down and trains people to work around IT instead of with it.

---

## IT is a product. Users are customers.

The way people experience IT - onboarding, support, tooling, permissions - that's a product experience. It can be well-designed or badly designed. It can be fast or slow. It can make people feel trusted or treated like a security risk.

Applying product thinking to IT means: asking what users actually need, designing the right interface (not always a ticket form), and measuring outcomes. An onboarding flow that takes 3 days is a product failure. An IT setup that people love using is a product success.

---

## Finish what you start.

An IT setup that's 80% automated is still 20% manual - and that 20% is the part that falls apart under pressure. The goal is full lifecycle coverage: a hire is provisioned end-to-end, a leaver is offboarded end-to-end, a policy change is applied everywhere. Partial automation creates hidden dependencies and false confidence.
