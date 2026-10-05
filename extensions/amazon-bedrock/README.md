# Granted Amazon Bedrock Provider

Official Granted provider plugin for Amazon Bedrock. It adds Bedrock model discovery, text generation, embeddings, and guardrail-aware provider routing for agents that use AWS-hosted models.

Install from Granted:

```bash
granted plugins install @granted/amazon-bedrock-provider
```

Configure AWS credentials and region through your normal Granted credential/profile setup, then select Bedrock models with the `amazon-bedrock/...` provider prefix.
