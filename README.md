# lp10-event-portal-backend

## Database schemas

### Church

-   _id: \_string_,
-   name: _string_,
-   type: _string_ ["parish" | "zone" | "region" | "province"],
-   parent*id?: \_string*,
-   created*at: \_string*,
-   modified*at: \_string*

### Persons

-   id: _ObjectId_,
-   first*name: \_string*,
-   last*name: \_string*,
-   email: _string_,
-   year*of_birth: \_number*,
-   gender: _string_,
-   origin: _string_,
-   denomination?: _string_,
-   chuch*id?: \_string*,
-   details?: _string_,
-   created*at: \_string*,
-   modified\*at: \_string

### Recurring Events

-   id: _ObjectId_,
-   name: _string_,
-   description: _string_,
-   month: _string_,
-   duration*in_days: \_number*,
-   created*at: \_string*
-   modified*at: \_string*

### Events

-   id: _ObjectId_,
-   name: _string_,
-   type: _string_;
-   platform: _string_,
-   paid*event: \_boolean*;
-   price: [<br>
    { category: "teacher", amount: number },<br>
    { category: "teenager", amount: number },<br>
    { category: "child", amount: number }
    <br>]
-   recurring*event_id?: \_string*,
-   year: _number_;
-   venue: _string_;
-   start*date: string,*
-   start*time: \_string,*
-   live: boolean,
-   created*at: \_string*
-   modified*at: \_string*

### Payers

-   id: _ObjectId_,
-   name: _string_,
-   email: _string_,
-   event_id: string;
-   expected*amount: \_number*,
-   transaction*ref: \_string*,
-   status: _string ['pending', 'verified', 'failed']_
-   created*at: \_string*
-   processed*at: \_string*

### Event Registrations

-   id: _ObjectId_,
-   event*id: \_ObjectId*,
-   person*id: \_ObjectId*,
-   payer*id: \_ObjectId*,
-   transaction*ref: string*,
-   payment*id?: \_ObjectId*,
-   status: _string ["pending" | "paid" | "cancelled" | "verified"]_,
-   checked_in: boolean,
-   created*at: string*
-   modified*at: tring*

### Payments

-   id: _ObjectId_,
-   payer*id: \_ObjectId*,
-   event*id: \_ObjectId*,
-   person*id?: \_ObjectId*,
-   registration*id: \_ObjectId* ,
-   amount*paid: \_number*,
-   provider: _string ["paystack" | "flutterwave" | "credo"]_,
-   transaction*ref: \_string*,
-   provider*ref: \_string*,
-   status: _string ["success" | "failed" | "abandoned"]_,
-   created*at: \_string*,
-   processed*at: \_string*
