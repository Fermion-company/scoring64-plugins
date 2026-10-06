# Scoring64

Scoring64 helps a local AI agent grade scanned answer sheets in the user's browser. The agent opens the installed Scoring64 application, imports the answer files selected by the user, applies the supplied answer key and scoring rubric, and saves the requested results. It checks the current student and question after each change. Illegible answers or missing criteria remain ungraded for the teacher to review. The teacher reviews results before using them for an official assessment.

## Requirements and use

Install Scoring64 from [the product website](https://fermion-company.github.io/scoring64-download/). This plugin requires Node.js 18 or later, local command execution, and a browser control tool connected to the same computer as Scoring64. Those tools and the application are not bundled. A remote or isolated environment cannot access the user's computer through its own localhost. Browser-only Claude sessions without local access are not supported.

Ask the agent: “Open Scoring64, grade these answer sheets using the attached answer key and partial-credit rubric, and save the results CSV.” The grade skill starts or reconnects to the application. Provide the exam, answer files, scoring criteria, and desired output. The application enforces its existing license entitlement; the plugin does not change licensing or make purchases. Work stops at an unavailable operation and can resume when the required entitlement is available.

This workflow is intended for adult teachers and grading staff. Do not send personal information about children under 13 to the AI provider. Prepare anonymized answer sheets and exam records before the agent views them. Official assessment results require teacher review.

Three example requests:

1. “Open the built-in fictional sample exam in Scoring64 and show the grading and export screens. Do not change scores.”
2. “Grade these anonymized answer sheets using the attached answer key and partial-credit rubric. Leave illegible answers ungraded.”
3. “Open this completed exam, check the ungraded and review counts, and save the results CSV. Report the output file path.”

For reviewer testing, install Scoring64 locally and choose the built-in fictional sample on the home screen; no account or production student data is required. Use the first example to inspect the sample without fabricating a rubric or changing grades. If the launcher cannot find the application, use its documented `--app` option with the installation's absolute path. If local command or browser access is unavailable, run in a local host with those tools.

## Data handling

Answer PDFs, names, student numbers, scores, and exports are processed and stored by Scoring64 on the local computer. The plugin launcher connects only to HTTP loopback addresses, reads local runtime metadata, and checks application health and license status. It sends no answer files to a Fermion plugin server, includes no analytics, and prints no license keys or PC codes. The AI agent's browser tools may send screenshots, answer text, names, and scoring instructions to the AI provider used by the user. The provider's account settings and policies govern that processing; this is not fully offline AI grading. Share only files you are authorized to process, and minimize identifying information when possible. See [the plugin privacy notice](https://github.com/Fermion-company/scoring64-plugins/blob/main/PRIVACY.md).

## Installation

Both packages are distributed from [Fermion-company/scoring64-plugins](https://github.com/Fermion-company/scoring64-plugins). The Codex package is in `plugins/codex`, and the Claude Code package is in `plugins/claude`. Add that repository as a plugin marketplace in the relevant host, then install `scoring64@fermion-scoring64`. Each package contains one grade skill and its dependency-free local launcher. No MCP server, additional model subscription, or paid API is configured by this plugin.

[User guide](https://fermion-company.github.io/scoring64-download/guide.html) · [Support](https://fermion-company.github.io/scoring64-download/contact.html)
