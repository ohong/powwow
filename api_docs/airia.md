## Example Request

```
curl --location "https://api.airia.ai/v2/PipelineExecution/b264f877-ae71-4552-85f4-bad59a2f661d" \
--header "X-API-KEY: $AIRIA_API_KEY" \
--header "Content-Type: application/json" \
--data "{
    \"userId\": \"$AIRIA_USER_ID\",
    \"userInput\": \"Example user input\",
    \"asyncOutput\": false
}"
```
