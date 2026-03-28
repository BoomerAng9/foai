<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Create a claude + n8n Build anything based on this video in the first person perspective as an instruction memo- [https://www.skool.com/ai-automation-society/new-video-build-anything-with-claude-code-n8n-beginners-guide?p=b3542389](https://www.skool.com/ai-automation-society/new-video-build-anything-with-claude-code-n8n-beginners-guide?p=b3542389)

then explain the following -
How do I install and setup n8n-MCP server for Claude Code
What are the 7 n8n skills in czlonkowski/n8n-skills repo
Give example n8n workflow built with Claude Code
How to optimize existing n8n workflows using Claude
Tutorial for turning n8n workflow into full web app

Here is the instruction memo and the technical breakdown based on the video and resources.

### **Memo: How I Build Anything with Claude Code \& n8n**

**To:** Automation Team
**From:** [Your Name/Boome_Ang]
**Subject:** The "God Mode" Stack: Building Full Apps with Claude Code + n8n

Team,

I’ve unlocked a new way to build that essentially puts our automation on autopilot. I’m no longer just "building workflows"; I’m orchestrating a system where **Claude Code** acts as my lead engineer and **n8n** is the backend engine.

Here is the "God Mode" workflow I’m using:

1. **The Brain (Claude Code)**: I’m running Claude Code in my terminal (or VS Code). It’s not just a chat; it’s connected directly to my n8n instance via an **MCP (Model Context Protocol)** server. This means Claude can *see* my nodes, read my existing workflows, and even push new workflows directly to n8n without me touching the canvas.
2. **The Knowledge (Skills)**: I’ve installed a specific set of "n8n Skills" into Claude. It now knows everything—how to write complex n8n expressions (the `{{$json}}` stuff that always breaks), which nodes to use, and how to fix its own validation errors.
3. **The Build**: I just type: *"Build a workflow that catches a webhook, scrapes a URL, and summarizes it with AI."* Claude generates the JSON, validates it against n8n’s rules, and deploys it.
4. **The Frontend**: This is the kicker. Once the n8n backend is running (exposing a webhook), I tell Claude: *"Build a Next.js frontend that posts to this webhook and displays the result."* It writes the React code, creates the project, and I deploy it to Vercel in minutes.

We are moving from "drag-and-drop" to "prompt-and-deploy." This is how we scale.

Let’s build.

***

### **Technical Guide: The Claude Code + n8n Stack**

#### **1. How to Install and Setup n8n-MCP Server for Claude Code**

The **n8n-MCP server** bridges Claude Code and your n8n instance, allowing Claude to "see" and control n8n.

**Prerequisites:**

* Node.js installed (v18+).
* Claude Code installed (`npm install -g @anthropic-ai/claude-code`).
* An active n8n instance (self-hosted or cloud).

**Setup Steps:**

1. **Clone the MCP Repository:**

```bash
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
```

2. **Install \& Build:**

```bash
npm install
npm run build
npm run rebuild  # Initializes the local database
```

3. **Get Your n8n Credentials:**
    * **N8N_HOST**: Your n8n URL (e.g., `https://n8n.yourdomain.com` or `http://localhost:5678`).
    * **N8N_API_KEY**: Go to n8n Settings > Developer > API Key > Create New.
4. **Configure Claude Code:**
You need to tell Claude Code about this server. You can do this by adding it to your Claude Desktop config or passing it directly.
    * **Method A (Config File):** Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/path/to/n8n-mcp/dist/index.js"],
      "env": {
        "N8N_HOST": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

    * **Method B (Direct Import):** If you use Claude Desktop, run `claude mcp add-from-claude-desktop` inside Claude Code to inherit the config.
5. **Verify:**
Run `claude` in your terminal. Type `/mcp` to see connected servers. You should see `n8n` listed with tools like `search_nodes`, `get_workflow`, etc.

***

#### **2. The 7 n8n Skills (czlonkowski/n8n-skills)**

These are markdown instructions you load into Claude so it stops hallucinating invalid nodes and writes perfect n8n syntax.

1. **n8n Expression Syntax**: Teaches Claude the correct `{{ $json.body.field }}` and `{{ $node["Name"].json.field }}` syntax, preventing common "variable not found" errors.
2. **n8n MCP Tools Expert**: Guides Claude on how to effectively use the MCP tools (searching for nodes, pulling templates) rather than guessing node parameters.
3. **n8n Workflow Patterns**: Provides proven architectural patterns (e.g., "Webhook -> Process -> Response" or "Polling Trigger -> Loop") so workflows are logical.
4. **n8n Validation Expert**: Allows Claude to "lint" its own workflows before saving them, checking for disconnected nodes or missing required parameters.
5. **n8n Node Configuration**: Deep knowledge of specific node properties (e.g., knowing that the "HTTP Request" node needs specific JSON settings for POST requests).
6. **n8n Code JavaScript**: Teaches Claude how to write valid ES6+ code inside the n8n "Code" node, handling n8n's specific data structure (items array).
7. **n8n Code Python**: Teaches Claude how to use the Python node correctly, managing libraries and data input/output formats unique to n8n.

**How to Install Skills:**

* Clone the repo: `git clone https://github.com/czlonkowski/n8n-skills.git`
* Copy the `.md` files into your Claude Code skills folder or pass them contextually when starting a session.

***

#### **3. Example n8n Workflow Built with Claude Code**

**Prompt to Claude:**
> "Build a workflow that receives a POST webhook containing a 'url', uses the 'ScrapingBee' node to get the HTML, passes it to an AI Agent to summarize the content, and sends the summary to Slack."

**Claude's Process (using Skills):**

1. **Pattern Match**: Activates *n8n Workflow Patterns* -> Selects "Webhook Processing Pattern."
2. **Tool Search**: Uses *n8n MCP Tools Expert* to find "Webhook," "ScrapingBee," "AI Agent," and "Slack" nodes.
3. **Configuration**:
    * **Webhook Node**: Sets method to `POST`.
    * **ScrapingBee Node**: Maps `{{ $json.body.url }}` using *n8n Expression Syntax*.
    * **AI Agent Node**: Configures the model and system prompt ("Summarize this HTML...").
    * **Slack Node**: Maps the AI output to the message text.
4. **Validation**: Checks connections and creates the JSON.
5. **Deploy**: Pushes the workflow to your n8n instance via MCP.

***

#### **4. How to Optimize Existing n8n Workflows Using Claude**

1. **Fetch the Workflow**: Inside Claude Code, run:
> "Get the workflow with ID `[workflow-id]` from my n8n instance."
*(Claude uses the `get_workflow` MCP tool to pull the full JSON).*
2. **Analyze**:
> "Analyze this workflow for performance bottlenecks and error handling gaps. Use the 'n8n Validation Expert' skill."
3. **Refactor**:
> "The 'Code' node in step 3 is using a slow loop. Rewrite it using vector operations in Python or optimized JavaScript map functions."
> "Add a global error handler workflow that catches failures and pings me on Discord."
4. **Update**:
> "Apply these changes and update the workflow on the server."
*(Claude uses `update_workflow` to save the optimized version).*

***

#### **5. Tutorial: Turning an n8n Workflow into a Full Web App**

**Concept:** n8n acts as your backend API. Claude Code builds the frontend.

**Step 1: Prepare the n8n Backend**

* Create a workflow starting with a **Webhook** node.
* Set it to `POST` and ensure it ends with a **Respond to Webhook** node.
* **Example**: A "Blog Post Generator." Input: Topic. Output: Generated Blog Post.
* Test the webhook URL (e.g., `https://n8n.yoursite.com/webhook/generate-blog`).

**Step 2: Initialize Frontend with Claude Code**

* In your terminal:
> "Create a new Next.js 14 app called 'blog-generator' using Tailwind CSS."

**Step 3: Connect Frontend to n8n**

* **Prompt Claude**:
> "I have an API endpoint at `[Your-n8n-Webhook-URL]`. It expects a JSON body `{ topic: string }` and returns `{ content: string }`.
>
> Build a modern, clean interface with:
> 1. An input field for the 'Topic'.
> 2. A 'Generate' button that calls this API.
> 3. A loading state while waiting.
> 4. A markdown display area for the result.
>
> Use the 'Frontend Designer' skill to make it look professional (glassmorphism style)."

**Step 4: Deploy**

* **Prompt Claude**:
> "Initialize a git repository, commit the code, and help me deploy this to Vercel."
* Claude will run the git commands and guide you through the `vercel deploy` command (or you can push to GitHub and Vercel will auto-deploy).

**Result:** A live SaaS application where the "logic" is just an n8n workflow you can update anytime without redeploying the frontend code.
<span style="display:none">[^1][^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^2][^20][^21][^22][^23][^24][^25][^26][^27][^28][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://github.com/czlonkowski/n8n-skills

[^2]: https://github.com/czlonkowski/n8n-mcp

[^3]: https://github.com/czlonkowski

[^4]: https://github.com/openai/skills

[^5]: https://github.com/numman-ali/openskills

[^6]: https://github.com/illuminaresolutions/n8n-mcp-server

[^7]: https://github.com/datacollectionspecialist/scrapeless-with-n8n

[^8]: https://github.com/czlonkowski/n8n-mcp/blob/main/docs/RAILWAY_DEPLOYMENT.md

[^9]: https://github.com/wddx1688/n8n-mcp

[^10]: https://github.com/holt-web-ai/n8n-nodes-claudecode

[^11]: https://github.com/alirezarezvani/claude-code-skill-factory

[^12]: https://github.com/ahmadsoliman/mcp-n8n-server

[^13]: https://github.com/n8n-io/n8n/blob/master/CLAUDE.md

[^14]: https://github.com/czlonkowski/n8n-mcp/pkgs/container/n8n-mcp-railway

[^15]: https://github.com/illuminaresolutions/n8n-mcp-server/blob/main/README.md

[^16]: https://github.com/czlonkowski/n8n-skills/blob/main/CLAUDE.md

[^17]: https://github.com/czlonkowski/n8n-skills/activity

[^18]: https://www.n8n-skills.com

[^19]: https://deepwiki.com/czlonkowski/n8n-skills

[^20]: https://www.youtube.com/watch?v=lL-hpEFIYHs

[^21]: https://www.skool.com/ai-automation-society/new-video-build-anything-with-claude-code-n8n-beginners-guide

[^22]: https://github.com/czlonkowski/n8n-skills/blob/main/docs/USAGE.md

[^23]: https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/

[^24]: https://www.youtube.com/watch?v=plvFtcmMXAo\&vl=en

[^25]: https://www.youtube.com/watch?v=e6VvRqmUY2Y

[^26]: https://www.youtube.com/watch?v=7Egx498mtj0

[^27]: https://www.youtube.com/watch?v=B6k_vAjndMo

[^28]: https://www.youtube.com/watch?v=OCO3aq3G0mk

