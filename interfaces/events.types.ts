import { Type, Static } from "@fastify/type-provider-typebox";

const event_schema = Type.Object({
		name: Type.String(),
		type: Type.Enum({
			recurring: "recurring",
			"one-time": "one-time",
		}),
		recurring_event_id: Type.Optional(Type.String()),
		venue: Type.String(),
		created_at: Type.String({ format: "date-time" }),
		modified_at: Type.String({ format: "date-time" }),
	}),
	recurring_events_schema = Type.Object({
		name: Type.String(),
		description: Type.String({
			examples: "three days programme set to transform teens",
		}),
		month: Type.String(),
		duration_in_days: Type.Number(),
		created_at: Type.String({ format: "date-time" }),
		modified_at: Type.String({ format: "date-time" }),
	}),
	event_registrations_schema = Type.Object({
		event_id: Type.String(),
		person_id: Type.String(),
		transaction_ref: Type.String(),
		created_at: Type.String({ format: "date-time" }),
		modified_at: Type.String({ format: "date-time" }),
	});

type Event = Static<typeof event_schema>;
type RecurringEvent = Static<typeof recurring_events_schema>;
type EventRegistration = Static<typeof event_registrations_schema>;

export { event_schema, recurring_events_schema, event_registrations_schema };
export type { Event, RecurringEvent, EventRegistration };
