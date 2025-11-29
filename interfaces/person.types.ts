import { Type, Static } from "@fastify/type-provider-typebox";
import { church_schema } from "./church.types";

const person_schema = Type.Object({
	first_name: Type.String(),
	last_name: Type.String(),
	email: Type.String({ format: "email" }),
	year_of_birth: Type.Number({
		minimum: new Date().getFullYear() - 70,
		maximum: new Date().getFullYear() - 10,
	}),
	gender: Type.String(),
	origin: Type.String(),
});

const payers_schema = Type.Object({
    payers_name: Type.String(),
    payers_email: Type.String({ format: "email" }),
    event_id: Type.String(),
    expected_amount: Type.Number(),
    transaction_ref: Type.String(),
    status: Type.String({ enum: ["pending", "verified", "failed"] }),
    paid_for: Type.Array(Type.String()),
    created_at: Type.Number()
});


const person_with_church_object = Type.Intersect([
	person_schema,
	church_schema
]);

const person_with_church_schema = Type.Array(person_with_church_object);

export type Person = Static<typeof person_schema>
export type PersonWithChurch = Static<typeof person_with_church_object>;
export type PersonWithChurchArray = Static<typeof person_with_church_schema>;

export {
	person_schema,
	payers_schema,
	person_with_church_object,
	person_with_church_schema
};