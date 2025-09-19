## Example Request To Find Data by Name

```
curl -H "Authorization: Bearer ceda32b590de3865269de5fef24ae1f4223738823a0c8e69cd39ef6069477008" -H "Content-Type: application/json" -d '[{"first_name":"Mark","last_name":"Morgan"}]' "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true&type=discover_new&discover_by=name"
```

## Example Response

```
{
	"snapshot_id": "s_mfr8fdhv1pgoknafxl"
}
```

## Example Request to Fetch Data from Snapshot Id

```
curl -H "Authorization: Bearer ceda32b590de3865269de5fef24ae1f4223738823a0c8e69cd39ef6069477008" "https://api.brightdata.com/datasets/v3/snapshot/123123?format=json"
```

## Example Response (Running)

```
{
	"status": "running",
	"message": "Snapshot is not ready yet, try again in 30s"
}
```

## Example Response (Successful)

See brightdata-example-response.json
