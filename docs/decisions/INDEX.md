# Decisions index (CSV)

id,title,tags,status
0001-restricted-paths,"Restricted data lives at a declared list of paths","practice-packs, governance, security",superseded
0002-restricted-path-modes,"Restricted paths have an access mode, deny unless listed","practice-packs, governance, security",active
0003-restricted-paths-enforcement,"Restricted paths are blocked in the host and never committed","practice-packs, governance, enforcement",active
0004-use-commands,"The commands approved to receive a use path are listed","practice-packs, governance, security",active
0005-sink-sources,"The sources allowed to fill a sink path are listed","practice-packs, governance, security",active
0006-restricted-data-hosts,"Restricted data is handled only on hosts with a blocking pre-tool hook","practice-packs, governance, security",active
0007-internal-data-routing,"Internal data goes only to approved cloud providers on paid no-training terms","practice-packs, governance, model-routing",active
0008-confidential-data-routing,"Confidential data may go wherever internal data may","practice-packs, governance, security",active
0009-prompt-logging,"Host prompt logging is disabled on every host","practice-packs, governance, observability",active
0010-secret-scan,"Secrets in added lines are scanned before a commit and a push","practice-packs, governance, security",active
0011-scan-allow-paths,"The secret scan skips a declared list of paths","practice-packs, governance, security",active
0012-pii-masking,"Personal data in tool output is masked with per-session pseudonyms","practice-packs, governance, security",active
0013-pii-extra,"The locale-bound types masked in tool output are listed","practice-packs, governance, security",active
0014-mcp-arguments-scanned,"MCP call arguments are scanned for secrets","practice-packs, hooks",active
0015-instruction-file-cap,"The always-loaded instruction file is capped at 150 lines","practice-packs, harness, cost",active
0016-procedure-delivery,"Detailed procedures live in skills loaded on demand","practice-packs, harness, cost",active
0017-noisy-work-placement,"Noisy work is delegated only when the cost model says the handoff is cheaper","practice-packs, harness, cost",active
0018-cache-hygiene,"No mid-task model, effort or instruction-file change; switches are confirmed","practice-packs, harness, cost",active
0019-compaction-timing,"Context is compacted at task boundaries","practice-packs, harness, cost",active
0020-watcher-noise,"Watchers are quiet","practice-packs, harness, cost",active
0021-routing-classes,"Routing distinguishes explore, plan, implement, review and debug","practice-packs, model-routing, cost",active
0022-routing-start-tiers,"Classes start at balanced tiers and the lowest effort they allow","practice-packs, model-routing, cost",active
0023-routing-max-escalations,"A failed step escalates at most 2 times, then a human decides","practice-packs, model-routing, cost",active
0024-routing-spend-cap,"Headless runs are capped at 5 USD where the host has a cap","practice-packs, model-routing, cost",active
0025-routing-cache-ttl,"The prompt cache lives one hour in the main session and five minutes in subagents","practice-packs, model-routing, cost",active
0026-gated-actions,"Gated actions need a human","practice-packs, hooks, guardrail",active
0027-gated-extra-patterns,"Project-specific commands that also need a human are listed","practice-packs, hooks",active
0028-gated-free-commands,"Outward-facing commands that run without asking are listed","practice-packs, hooks",active
0029-gated-free-channels,"Release and publish channels that run without asking are listed","practice-packs, hooks",active
0030-gated-run-grants,"Outward commands a run or a remembered approval may allow are listed","practice-packs, hooks",active
0031-mcp-no-project-policy,"No project list of MCP servers","practice-packs, hooks",active
0032-checkpoint-before-gated-action,"Work is checkpointed before a gated action","practice-packs, hooks, guardrail",active
0033-checkpoint-trigger-gated-action,"A checkpoint is taken before a gated command","practice-packs, hooks",active
0034-checkpoint-retention,"The 10 newest checkpoints are kept","practice-packs, hooks",active
0035-verification-checks,"Implement and debug steps pass the project's detected check commands","practice-packs, verification, harness",active
0036-verification-test-command,"The verification test command is ""cd app && npx vitest run""","practice-packs, verification, harness",active
0037-verification-lint-command,"The verification lint command is """"","practice-packs, verification, harness",active
0038-verification-typecheck-command,"The verification typecheck command is ""cd app && npm run check""","practice-packs, verification, harness",active
0039-verification-format-command,"The verification format command is """"","practice-packs, verification, harness",active
0040-verification-static-analysis-command,"The verification static-analysis command is """"","practice-packs, verification, harness",active
0041-verification-build-command,"The verification build command is """"","practice-packs, verification, harness",active
0042-verification-unit-command,"The verification unit command is """"","practice-packs, verification, harness",active
0043-verification-integration-command,"The verification integration command is """"","practice-packs, verification, harness",active
0044-verification-e2e-command,"The verification e2e command is """"","practice-packs, verification, harness",active
0045-verification-coverage-command,"The verification coverage command is """"","practice-packs, verification, harness",active
0046-verification-coverage-bar,"Coverage must meet what the coverage command enforces","practice-packs, verification, harness",active
0047-verification-machine-profile,"Cheap checks run locally, slow checks only in CI (thin machine profile)","practice-packs, verification, harness, ci",active
0048-verification-review-bar,"Review steps pass a reviewer-agent verdict","practice-packs, verification, harness",active
0049-verification-gate,"""Done"" is blocked while the verification checks fail","practice-packs, verification, harness",active
0050-agent-roster,"Work is delegated to planner, explorer, implementer, reviewer and tester agents","practice-packs, agent-roles, harness",active
0051-reviewer-access,"The reviewer reports findings and changes nothing","practice-packs, agent-roles, harness",active
0052-parallel-isolation,"Each parallel task runs in its own git worktree","practice-packs, agent-roles, harness",active
0053-worktree-location,"Task worktrees live next to the repository","practice-packs, agent-roles, harness",active
0054-max-concurrent-agents,"At most 3 agents run at once","practice-packs, agent-roles, harness",active
0055-human-escalation,"Agents hand over to a human when blocked, before irreversible or outward-facing actions, and on a guardrail denial","practice-packs, agent-roles, harness",active
0056-handoff-contract,"Handoffs are a brief in, then a result and evidence out","practice-packs, agent-roles, harness",active
0057-claim-lease-agent,"The lease of an agent's claim is 60 minutes","practice-packs, agent-roles, harness",active
0058-claim-lease-ci,"The lease of a CI job's claim is 60 minutes","practice-packs, agent-roles, harness",active
0059-claim-lease-human,"The lease of a person's claim is 480 minutes","practice-packs, agent-roles, harness",active
0060-claim-clock-skew,"A lease lapses 5 minutes after its expiry, and a clock that far off the host cannot claim","practice-packs, agent-roles, harness",active
0061-claim-parent-idle,"A parent unit with live children is flagged idle after 7 days without action","practice-packs, agent-roles, harness",active
0062-claim-brief-max,"A delegated unit keeps at most 8 KB of brief fields in the claims ledger","practice-packs, agent-roles, harness",active
0063-work-pick-among,"Workers pick among the first 5 ready work units","practice-packs, agent-roles, harness",active
0064-work-wip-per-worker,"A worker holds at most max-concurrent work units at once","practice-packs, agent-roles, harness",active
0065-work-wip-per-feature,"At most none work units of one feature are claimed at once","practice-packs, agent-roles, harness",active
0066-merge-queue,"The merge queue is off: ship merges through it only when it is on","practice-packs, agent-roles, harness",active
0067-telemetry-recording,"Each routed step is recorded as one metadata JSON line in the local state directory","practice-packs, observability, harness",active
0068-telemetry-retention,"The metadata log keeps 30 days","practice-packs, observability, harness",active
0069-telemetry-export,"Telemetry is not exported","practice-packs, observability, harness",active
0070-restricted-paths,"Restricted data lives at a declared list of paths","practice-packs, governance, security",active
0071-plan-first-materials-after,"The AI plan appears first; materials are added to it afterwards","product, performance",active
0072-materials-only-from-a-verified-list,"Materials come only from a list of verified sites kept in the code","product, ai, quality",active
0073-owner-statistics-page-without-tracking,"The owner reads usage numbers on a statistics page built from existing tables","product, privacy, observability",active
0074-free-tier-ai-key-exception,"The site's AI key may be a free-tier Gemini key, with people told in the privacy page","governance, model-routing, privacy",active
