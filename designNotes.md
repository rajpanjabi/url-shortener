
by default it is set to require, to use imports we need to add a line "type:'module'' in package.json
import vs require in node.js applications

require: Still prevalent in many existing Node.js projects, especially older ones. It's suitable for situations where synchronous loading or dynamic module paths are necessary.
import: The modern and preferred approach for new Node.js projects and in browser environments. It offers benefits like static analysis, tree-shaking, and better integration with modern JavaScript features.


import (ES Modules - ESM):
Asynchronous Loading: import statements are designed for asynchronous loading, especially beneficial for modern applications and browser environments.
Static Analysis: import statements are hoisted to the top of the file and parsed during the initial loading phase, allowing for static analysis and optimization by tools.
Usage:
JavaScript

    import fs from 'fs';
    import { myFunction } from './myModule.js';
    import * as myModule from './myModule.js';



require (CommonJS Modules):
Synchronous Loading: require loads modules synchronously, meaning the program execution pauses until the module is fully loaded and processed.
Dynamic Loading: require can be called conditionally and dynamically from anywhere in the code. The module path can be determined at runtime.
Usage:
JavaScript

    const fs = require('fs');
    const myModule = require('./myModule.js');
Exports: Modules export using module.exports = ... or exports.propertyName = ....



Design choices for database
Here we are using postgresql which is a relational databse
while setting up connection with this db, we use Pool instead of client.
what is client?
Client is mainly used when we just need to establish a single connection. for instances where we are perfoirming singular tasks like scripts or one-off connections (like data migration or setup scripts).
Also we need to manage client's connection lifecycle i.e on and off (manual connect and disconnect)

what is pool?
A pool on other hand is a pool of multiple connections.
A Pool manages a set of reusable connections to your database.
Instead of creating a new database connection every time an API call happens, a pool:
	•	Reuses existing connections for multiple requests.
	•	Keeps a few idle connections ready for new requests.
	•	Prevents overwhelming the DB by limiting the max number of concurrent connections (max: 20).
	•	Automatically handles timeouts, disconnections, and recovery.
Connection Lifecycle is Auto-managed


creating a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

2 main events of pool:
a)connect event fires whenever a new connection is established.
b)error event ensures that if something bad happens (e.g., connection lost), the app logs it and exits gracefully.

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit



initdatabse function




To use psql in terminal 
psql -U postgres

Redis

Redis is a high-performance, in-memory data store. It’s often used for caching, session storage, rate limiting, pub/sub messaging, and more.

In-memory: Data is stored in RAM → extremely fast reads/writes.
	2.	Key-value store: Everything is stored as a key-value pair.
	3.	Persistence optional: Can persist data to disk using RDB or AOF.
	4.	Data structures: Redis supports strings, hashes, lists, sets, sorted sets, bitmaps, and more.
	5.	Single-threaded: Uses an event loop → fast for most workloads.
	6.	TTL support: You can set expiration on keys (EXPIRE) → great for caching.

node-redis is the Redis client for Node.js/JavaScript

For generating short codes in url we use base 62 method, we can also use hashing but it is a bit inefficient, because we need to take care of collisions, also a hash of a url or anything is about 32 bits which is very long. to generate unique urls we need about 7 characters. by using 7 chars we can form about 3.5 trillion unique combinations

we use base62 method, 62 here means 62 chars which are '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

we use nanoid library 






React 101

JSX allows to write HTML inside javascript
Components in React are reusable blocks like <Navbar/> this can be used on multiple pages

Just like how we hava params that go into a function, we can pass props to a component <Content name="Raj" age="23">. here name and age are props passed to a component Content

There are certain parts of the page that changes, to manage them we use state. example a counter
we do something like const [count, setCount] =useState(0) where 0 is the init values and the count is the variable the value holder. the setCount is the method to update the state of this count variable whenever required.

useState, useEffect , etc are some of the hooks that are commonly used. Hooks are special functions to use React features like state, effects

React uses something known as virtual DOM for faster and efficient UI updates (re-rendering)

DOM is Document Object Model, a programming interface for web documents.
DOM represents the entire document as a tree of nodes, where nodes are the aprts of the page like elements, text, attributes. so, browser uses this dom to render the webpage and JS can dynamically interact with it to change or update content
. Direct manipulation of the Real DOM can be computationally expensive

The Virtual DOM (VDOM) in React is a lightweight, in-memory representation of the Real DOM. It is a programming concept where a "virtual" representation of the UI is kept in memory and synced with the "real" DOM by a library like React DOM

Here's how the updates look like:
1) Intial Render: When a React component first renders, React creates a Virtual DOM tree representing the UI and renders it to the Real DOM.
2) State/Props Changes: When a component's state or props change, instead of directly updating the Real DOM, React creates a new Virtual DOM tree representing the updated UI.
3) Diffing Algorithm: React then uses a process called "diffing" to compare the new Virtual DOM with the previous one. This algorithm efficiently identifies the differences between the two trees
4) Reconciliation: Based on the identified differences, React calculates the most efficient way to update the Real DOM. This involves applying only the necessary changes to the Real DOM, rather than re-rendering the entire page
5) Real DOM Update: Finally, React updates only the changed parts of the Real DOM, leading to improved performance and a more responsive user experience compared to direct Real DOM manipulation.

Conditional Rendering is another feature of React {isLoggedIn ? <Dashboard/> : <Login/>}



Redux 101
Redux is a state management library for JS apps.

Why do we need Redux?
Let's say we have a state at App level and that is used by several components and its nested and hten its nested components.
there may be components that do not use this state, but their grandchildren use it. this problem is known as prop drilling and is inefficient, to handle this we use redux toolkit

Redux states dont store your states at root or app level, instead put it in a store and all the components that use that state , just subscribes to them and then re-renders themselves whenver the state changes  
this way debugging, scalability improves.

Architecture of Redux:

whenever user does somehting or performs an event like incrementing counter or adding product ot cart or xyx, we need an handler funciton that handles it. the handler function dispatches this event to redux store.

for example lets consider the cart example, we have 1 product in cart, now user clicks on add product, what happesn is ecvent handler dispacthes the event to redux store which has vlaue 1 but it doesnot know how to deal with it so it passes this event(event naem:addProductToCart and initvalue:1) to a reducer fucntion(whcih we define for this event)
and reducer now return updated state (2) to redux store. now the components that subscribed to this state re-renders and updates ui.



State: The single source of truth for our app. Stored in a store
e.g {
  user:{name:"Raj", loggedIn:true},
  urls:[{id:1, longUrl:"https://longurllll.com", shortCode:'ex1"}]

}

Actions: describe what happened in our app. they are plain javascript objects with type and optional payload

const ADD_URL="ADD_URL";

const addUrlAction={
  type:ADD_URL,
  payload:{id:1, longUrl:"https://longurllll.com", shortCode:'ex1"}
};

Reducers: specify how the state changes in response to an action. pure functions, no side effects, no api calls


const initialState = {
  urls: []
};

  function urlReducer(state = initialState, action) {
      switch(action.type) {
        case "ADD_URL":
          return {
            ...state,
            urls: [...state.urls, action.payload]
          };
        default:
          return state;
      }
  }
