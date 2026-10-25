from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, SerializerFunctionWrapHandler, field_serializer
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """camelCase on the wire, to match the JSON the Next.js app already uses."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    # Datetimes come back from MongoDB as naive UTC. Mark them as UTC on the way out,
    # otherwise browsers read "2026-10-25T09:06:00" as local time and show it hours off.
    @field_serializer("*", mode="wrap", check_fields=False)
    def _utc_datetimes(self, value: object, handler: SerializerFunctionWrapHandler) -> object:
        if isinstance(value, datetime) and value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return handler(value)
