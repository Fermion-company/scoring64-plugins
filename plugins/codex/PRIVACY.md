# Scoring64 plugin privacy notice

Effective date: October 6, 2026. Publisher: 株式会社Fermion. This notice covers the Scoring64 plugins for Codex and Claude, version 0.1.2.

## Purpose and information used

The plugins instruct an AI agent to operate Scoring64 on the user's computer to import answer sheets, apply user-supplied grading criteria, and save results. The workflow may use answer PDFs and images, student names and numbers, exam details, answer keys, grading rubrics, scores, and output files. The user selects the material and task. Unnecessary identifying information should be removed before sharing with an AI agent when possible.

## Local application and launcher

Scoring64 stores and processes application data on the local computer. The bundled launcher reads local application runtime information and checks health and license status through HTTP loopback addresses. It may start the installed application. It does not upload answers, collect analytics, or connect to a Fermion plugin server. It omits license keys and PC codes from its output. The plugin does not set up a remote MCP server.

## AI provider and external websites

Browser tools used by the AI agent may send screenshots, visible answers, names, text, scoring criteria, and conversation content to the user's AI provider, such as OpenAI or Anthropic. Processing, retention, and training settings are governed by that provider's terms, privacy policy, and the user's account settings. Local Scoring64 storage does not make the AI workflow fully offline. The plugin does not control the provider's retention settings. Visiting linked product, support, or GitHub pages involves those websites' own data handling.

## Storage and user control

Fermion does not receive answer data through the plugin launcher and maintains no plugin-server copy of it. Local application files and exports remain on the user's computer until removed by the user using the application or file tools. AI conversation and tool records are controlled separately through the AI service. Users can decline to share an answer, stop the agent, uninstall the plugin, remove local files, and manage conversation records through the provider. Only process material you have authority to use, including any required consent or institutional authorization.

## Contact

For questions about this plugin, contact [Scoring64 support](https://fermion-company.github.io/scoring64-download/contact.html) or contact@fermion.company. Questions about AI-provider records should be directed to the provider used for the session.
