# lp10-event-portal-backend

## Database schemas
### Persons
- id: _number_,
- first_name: _string_,
- last_name: _string_,
- email: _string_,
- year_of_birth: _number_,
- gender: _string_,
- origin: _string_,
- parish?: _string_,
- zone?: _string_,
- region?: _string_
- province?: _string_,
- denomination?: _string_,
- details?: _string_,
- hasPaid: _boolean_

### Payers
- id: _number_,
- name: _string_,
- email: _string_,
- expected_amount: _number_,
- transaction_ref: _string_,
- status: _string ['pending', 'verified']_
- created_at: _date | string_
- processed_at: _date | string_