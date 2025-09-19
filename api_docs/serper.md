## Example Request

```
const request = require('request');
let options = {
  'method': 'POST',
  'url': 'https://google.serper.dev/search',
  'headers': {
    'X-API-KEY': '18f5d04f387d80c2e2a0cbfaa319b6ac430006ac',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "q": "apple inc"
  })

};
request(options, (error, response) => {
  if (error) throw new Error(error);
  console.log(response.body);
});
```

## Example Response

See serper-response.json
