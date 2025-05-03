export interface Person {
    first_name: string,
    last_name: string,
    email: string,
    year_of_birth: number,
    gender: string,
    origin: string,
    parish?: string,
    zone?: string,
    region?: string,    
    province?: string,
    denomination?: string,
    details?: string,
    hasPaid: boolean
}