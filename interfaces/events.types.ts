import { Type, Static } from "@fastify/type-provider-typebox";

const event_schema = Type.Object({
		name: Type.String(),
		type: Type.Enum({
			recurring: "recurring",
			"one-time": "one-time",
		}),
		platform: Type.Enum({
			online: "online",
			"on-site": "on-site",
		}),
		paid_event: Type.Boolean(),
		price: Type.Array(Type.Object({
			category: Type.Enum({
				teacher: "teacher",
				teenager: "teenager",
				child: "child",
			}),
			amount: Type.Number(),
		})),
        live: Type.Boolean({default: false, description: 'This field is used to identify the current event registration is being taken for...'}),
		recurring_event_id: Type.Optional(Type.String()),
		venue: Type.Optional(Type.String()),
		start_date: Type.Optional(Type.String({ format: "date" })),
		start_time: Type.Optional(Type.String({ format: "time" })),
		year: Type.Number({ minimum: 2000 }),
	}),
	recurring_events_schema = Type.Object({
		name: Type.String(),
		description: Type.String({
			examples: ["three days programme set to transform teens"],
		}),
		month: Type.String(),
		duration_in_days: Type.Number(),
	});

type Event = Static<typeof event_schema>;
type RecurringEvent = Static<typeof recurring_events_schema>;

export { event_schema, recurring_events_schema };
export type { Event, RecurringEvent };
