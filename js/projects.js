// Case study content. Add a project by adding an object; no HTML changes needed.
//
// Our client work is under NDA, so entries describe the KIND of system we built,
// never the client, product name, or code. Don't name third-party products or
// open-source projects as our work.
//
// slug         URL-safe id, used in the hash: #work/<slug>
// placeholder  true = every text element gets class "ph" (replace with real content, then remove)
// image        { src, alt } or null (null shows a placeholder block)
// result.metrics  up to 3: { value, decimals?, prefix?, suffix?, label }. Only real, NDA-safe numbers.
// gallery      optional array of { src, alt }; null src shows a placeholder block
window.TOPIS_PROJECTS = [
  {
    slug: 'web-platform',
    placeholder: true,
    title: 'Web application platform',
    client: 'Under NDA · Developer tools',
    summary: 'Framework-level frontend and server rendering work for a large web platform.',
    image: null,
    challenge: 'Placeholder. What the client needed, in NDA-safe terms.',
    approach: 'Placeholder. Our role and key technical decisions.',
    result: { text: 'Placeholder. The outcome, in NDA-safe terms.', metrics: [] },
    stack: ['React', 'TypeScript', 'Node.js'],
    gallery: null,
  },
  {
    slug: 'scheduling-platform',
    placeholder: true,
    title: 'Scheduling and booking platform',
    client: 'Under NDA · SaaS',
    summary: 'Full-stack work on a multi-tenant scheduling product with calendar integrations.',
    image: null,
    challenge: 'Placeholder.',
    approach: 'Placeholder.',
    result: { text: 'Placeholder.', metrics: [] },
    stack: ['TypeScript', 'PostgreSQL'],
    gallery: null,
  },
  {
    slug: 'llm-applications',
    placeholder: true,
    title: 'LLM application framework',
    client: 'Under NDA · AI',
    summary: 'Backend and AI engineering for agent, retrieval and tool-use pipelines.',
    image: null,
    challenge: 'Placeholder.',
    approach: 'Placeholder.',
    result: { text: 'Placeholder.', metrics: [] },
    stack: ['Python', 'LLM APIs', 'Vector search'],
    gallery: null,
  },
  {
    slug: 'model-serving',
    placeholder: true,
    title: 'Local model inference',
    client: 'Under NDA · AI infrastructure',
    summary: 'Backend work on running and serving language models on local and private hardware.',
    image: null,
    challenge: 'Placeholder.',
    approach: 'Placeholder.',
    result: { text: 'Placeholder.', metrics: [] },
    stack: ['Go', 'C++'],
    gallery: null,
  },
  {
    slug: 'blockchain-node',
    placeholder: true,
    title: 'Blockchain node infrastructure',
    client: 'Under NDA · Web3',
    summary: 'Backend engineering on Ethereum-compatible node and protocol software.',
    image: null,
    challenge: 'Placeholder.',
    approach: 'Placeholder.',
    result: { text: 'Placeholder.', metrics: [] },
    stack: ['Go', 'Solidity'],
    gallery: null,
  },
];
