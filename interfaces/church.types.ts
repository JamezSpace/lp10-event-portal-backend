import { Type, Static } from "@fastify/type-provider-typebox";

const church_schema = Type.Object({
	// name: Type.String(),
	parish: Type.Optional(Type.String()),
	zone: Type.Optional(Type.String()),
	region: Type.Optional(Type.String()),
	province: Type.Optional(Type.String()),
	denomination: Type.Optional(Type.String()),
	details: Type.Optional(Type.String())
});

export type ChurchBody = Static<typeof church_schema>;
export { church_schema };
