import { Type, Static } from "@fastify/type-provider-typebox";

// take note, person_ids is part of the schema as an array, just to receive data from frontend and store as single entries "person_id" in database, that is, person_ids is not stored as an array in database
const event_registrations_schema = Type.Object({
		event_id: Type.String(),
        person_id: Type.String(),
		person_ids: Type.Array(Type.String()),
        transaction_ref: Type.String(),
		payer_id: Type.String(),
		payment_id: Type.Optional(Type.String()),
		status: Type.Enum(["pending", "paid", "cancelled", "verified"], {
			default: "pending",
		}),
		checked_in: Type.Boolean({ default: false }),
	});

type EventRegistration = Static<typeof event_registrations_schema>;

export { event_registrations_schema };
export type { EventRegistration };
