# AI prompts

This file records the prompt used to build this project in Cursor on 24 October 2026.

The assistant was Cursor’s coding agent (Grok). There is no public chat link. The assistant’s replies were applied as files and terminal commands in this workspace. They are not copied below as a rewritten dialogue, because a generated transcript would not be the original log.

## Prompt

TDD Kata: Car Dealership Inventory System

Objective

The goal of this kata is to design, build, and test a full-stack Car Dealership Inventory System. This project will test your skills in API development, database management, frontend implementation, testing, and modern development workflows, including the use of AI tools.

Core Requirements

1. Backend API (RESTful)

You are to build a robust backend API that will serve as the brain of the application.

Technology: Choose one of the following: Node.js/TypeScript (with Express/NestJS), Python (with Django/FastAPI), or Ruby (with Rails).

Database: The application must connect to a database (e.g., PostgreSQL, MongoDB, SQLite). An in-memory database is not sufficient.

User Authentication:

Users must be able to register and log in.

Implement token-based authentication (e.g., JWT) to secure certain API endpoints.

API Endpoints:

Auth: POST /api/auth/register, POST /api/auth/login

Vehicles (Protected):

POST /api/vehicles: Add a new vehicle.

GET /api/vehicles: View a list of all available vehicles.

GET /api/vehicles/search: Search for vehicles by make, model, category, or price range.

PUT /api/vehicles/:id: Update a vehicle's details.

DELETE /api/vehicles/:id: Delete a vehicle (Admin only).

Inventory (Protected):

POST /api/vehicles/:id/purchase: Purchase a vehicle, decreasing its quantity.

POST /api/vehicles/:id/restock: Restock a vehicle, increasing its quantity (Admin only).

Each vehicle must have a unique ID, make, model, category, price, and quantity in stock.

2. Frontend Application

You must build a modern, single-page application (SPA) to interact with your backend API.

Technology: You must use HTML5, CSS3, Tailwind, and React

Functionality:

User registration and login forms.

A dashboard or homepage to display all available vehicles.

Functionality to search and filter vehicles.

A "Purchase" button on each vehicle, which should be disabled if the quantity is zero.

(For Admin Users) Forms/UI to add, update, and delete vehicles.

Design: This is a chance to show your creativity. The application should be visually appealing, responsive, and provide a great user experience.

Process & Technical Guidelines

1. Test-Driven Development (TDD)

Write tests before implementing functionality. We expect to see a clear "Red-Green-Refactor" pattern in your commit history, especially for the backend logic. Aim for high test coverage with meaningful test cases.

2. Clean Coding Practices

Write clean, readable, and maintainable code. Follow SOLID principles and other best practices in software design. Your code should be well-documented with meaningful comments and clear naming conventions.

3. Git & Version Control

Use Git for version control. Commit your changes frequently with clear, descriptive messages that narrate your development journey.

4. AI Usage Policy (Important)

We believe AI is a critical tool in the modern software development lifecycle. You are encouraged and expected to use AI tools. However, you must be transparent about it.

AI Co-authorship: For every commit where you used an AI tool (for generating boilerplate, writing tests, debugging, etc.), you must add the AI as a co-author.

How to add a co-author: At the end of your commit message, add two empty lines, followed by the co-author trailer.

git commit -m "feat: Implement user registration endpoint

Used an AI assistant to generate the initial boilerplate for the
controller and service, then manually added validation logic.

Co-authored-by: AI Tool Name <AI@users.noreply.github.com>"

README Documentation: Your README.md file must include a detailed section titled "My AI Usage". In this section, you must describe:

Which AI tools you used (e.g., GitHub Copilot, ChatGPT, Gemini, etc.).

How you used them (e.g., "I used Gemini to brainstorm API endpoint structures," or "I asked Copilot to generate unit tests for my service layer").

Your reflection on how AI impacted your workflow.

Interview Discussion: Be prepared to discuss your AI usage in detail during the interview. We are interested in how you leverage these tools effectively and responsibly.

Deliverables

A public Git repository link (e.g., on GitHub, GitLab).

A comprehensive README.md file that includes:

A clear explanation of the project.

Detailed instructions on how to set up and run the project locally (both backend and frontend).

Screenshots of your final application in action.

The mandatory "My AI Usage" section.

A test report showing the results of your test suite.

A root PROMPTS.md containing your raw, unedited AI chat logs or public chat links (no AI-generated summaries).

(Optional - Brownie Points) A link to the deployed, live application on a platform like Vercel, Netlify, Heroku, or AWS.

Note: Plagiarism is strictly forbidden. While we encourage AI assistance, submitting code copied from other repositories or developers will result in immediate rejection. We want to see your work, augmented by modern tools.

# Project: Car Dealership Inventory System

Build a complete, functional, beginner-friendly full-stack Car Dealership Inventory System based on the requirements below.

## 1. IMPORTANT INSTRUCTIONS

I have a deadline tomorrow. Prioritise a working application, simplicity, and completion of all mandatory requirements.

Follow these rules:
- Write clean, readable code suitable for a beginner to understand.
- Avoid overengineering, unnecessary abstractions, complicated design patterns, and excessive files.
- Do not use microservices, Docker, Redis, or other unnecessary infrastructure.
- Do not generate placeholder functionality when a working implementation is required.
- Do not repeatedly rewrite files that already work.
- Inspect the existing project before making changes.
- Implement the application incrementally and verify each feature.
- Do not claim that tests pass without running them.
- Explain important implementation decisions briefly.
- Prioritise mandatory requirements over optional enhancements.

Do not stop after creating a plan. Implement the application and verify it.

## 2. TECHNOLOGY STACK

Use exactly this stack:

Backend:
- Python
- FastAPI
- SQLite for persistent database storage
- SQLAlchemy for database operations
- JWT for token-based authentication
- Argon2 or bcrypt for password hashing
- pytest and FastAPI TestClient for automated tests

Frontend:
- React
- Vite
- JavaScript
- HTML5
- CSS3
- Tailwind CSS

Integration:
- REST API
- Fetch API for frontend-backend communication

Do not substitute these technologies without a compelling compatibility reason.

## 3. PROJECT STRUCTURE

Use a simple structure similar to:

car-dealership/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── requirements.txt
│   └── tests/
│       └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── screenshots/
├── README.md
├── PROMPTS.md
└── .gitignore

You may adjust the structure slightly if required, but keep it simple.

## 4. DATABASE

Use SQLite with SQLAlchemy.

The database must persist between application restarts. Do not use an in-memory database for the actual application.

Create two database models.

### User
- id
- username
- email
- password_hash
- role

Roles:
- customer
- admin

Requirements:
- Username and email must be unique.
- Passwords must be securely hashed.
- New public registrations must always receive the customer role.
- Users must not be able to make themselves administrators by changing request data.
- Provide a safe development method for creating an administrator account.

### Vehicle
- id
- make
- model
- category
- price
- quantity
- created_at
- updated_at

Requirements:
- All required fields must be validated.
- Price must be positive.
- Quantity cannot be negative.
- Use appropriate database constraints.
- Validate update and restock operations.

## 5. BACKEND API

Implement these endpoints.

### Authentication

POST /api/auth/register
- Register a user.
- Validate the input.
- Hash the password.
- Reject duplicate usernames and emails.
- Assign the customer role by default.

POST /api/auth/login
- Validate the credentials.
- Return a JWT access token.
- Reject invalid credentials.

Use JWT authentication for protected endpoints. Verify token signatures and expiration.

### Vehicles

GET /api/vehicles
- Return vehicle inventory.
- Include vehicles with zero stock so the frontend can display them as unavailable.

GET /api/vehicles/search
- Support filtering by make, model, category, minimum price, and maximum price.
- Allow multiple filters to be combined.

POST /api/vehicles
- Admin only.
- Add a vehicle.

PUT /api/vehicles/{id}
- Admin only.
- Update vehicle details.

DELETE /api/vehicles/{id}
- Admin only.
- Delete a vehicle.

### Inventory

POST /api/vehicles/{id}/purchase
- Require authentication.
- Purchase exactly one unit.
- Decrease quantity by one.
- Reject purchases when stock is zero.
- Return an appropriate error for nonexistent vehicles.
- Prevent stock from becoming negative.
- Use a transaction or atomic database update to prevent overselling during concurrent purchases.

POST /api/vehicles/{id}/restock
- Admin only.
- Accept a positive quantity.
- Increase the vehicle's stock.
- Reject invalid quantities.

### HTTP status codes

Use appropriate HTTP status codes, including:
- 200 for successful operations.
- 201 for successful resource creation.
- 400 for invalid business operations where appropriate.
- 401 for missing or invalid authentication.
- 403 for insufficient permissions.
- 404 for nonexistent resources.
- 422 for request validation errors.

Return understandable error messages.

## 6. TEST-DRIVEN DEVELOPMENT

This assignment explicitly requires TDD.

Follow the Red-Green-Refactor workflow for backend functionality.

For each feature:

1. Write the test before implementing the feature.
2. Run the test and verify that it fails for the expected reason.
3. Implement the minimum code needed to pass.
4. Run the test again.
5. Refactor if necessary.
6. Rerun relevant tests.

Do not write the entire application first and add tests afterward.

Create automated tests covering:

Authentication:
- Successful registration.
- Duplicate registration.
- Password hashing.
- Successful login.
- Invalid login.
- Missing or invalid JWT.

Vehicle operations:
- Listing vehicles.
- Searching by make, model, category, and price.
- Creating vehicles.
- Updating vehicles.
- Deleting vehicles.
- Rejecting invalid prices and quantities.

Authorization:
- Unauthenticated users cannot access protected endpoints.
- Customers cannot perform administrator-only operations.
- Administrators can manage inventory.

Purchasing and restocking:
- Successful purchase decreases stock by one.
- Purchasing with zero stock is rejected.
- Purchasing a nonexistent vehicle returns 404.
- Invalid restock quantities are rejected.
- Successful restocking increases stock.
- Concurrent purchases cannot oversell inventory.

Use an isolated test database so tests do not modify actual development data.

Run the complete test suite and report the actual results.

Do not fabricate test results or coverage figures.

## 7. FRONTEND

Build a modern, responsive React single-page application.

Use Tailwind CSS for styling.

### Design

Create a clean automotive dealership interface with:
- A professional navigation bar.
- A login and registration interface.
- A vehicle inventory dashboard.
- Vehicle cards.
- Search and filter controls.
- A purchase button.
- An Admin inventory management interface.

Use a restrained automotive-inspired colour palette, clear typography, consistent spacing, and responsive layouts.

Use simple CSS or text-based placeholders for vehicle imagery if actual images are unavailable. Do not spend excessive time sourcing images.

### Authentication

Implement:
- Registration form.
- Login form.
- JWT-based API authentication.
- Logout functionality.
- Clear error messages.

Do not store passwords in the browser.

Avoid storing authentication tokens in localStorage if a safer practical alternative is available. If using localStorage for this deadline-driven demonstration, document the trade-off and do not treat it as production-grade secure storage.

### Inventory dashboard

Display:
- Make.
- Model.
- Category.
- Price.
- Available quantity.

Include:
- Search by make and model.
- Category filtering.
- Minimum and maximum price filters.
- A clear indication when a vehicle is out of stock.
- A purchase button on each vehicle.

The purchase button must be disabled when quantity is zero.

After a successful purchase:
- Display a success message.
- Refresh the vehicle quantity.
- Update the interface without requiring a complete page reload.

Handle loading states, API errors, and empty search results.

### Admin interface

Administrators should be able to:
- Add vehicles.
- Edit vehicle details.
- Delete vehicles.
- Restock vehicles.

Customers must not see the Admin management controls.

Remember that hiding frontend controls is not authorization. The backend must enforce all permissions.

## 8. FRONTEND-BACKEND INTEGRATION

Configure the frontend to communicate with the FastAPI backend.

Requirements:
- Use a configurable backend API base URL.
- Configure CORS for local development.
- Use Fetch API.
- Include the JWT in the Authorization header for protected requests.
- Handle expired or invalid tokens.
- Display meaningful API errors.
- Ensure that the frontend and backend work together.

Do not replace API calls with hardcoded mock data.

## 9. AI USAGE DOCUMENTATION

The assignment requires transparent AI usage.

Create a root-level PROMPTS.md file containing the actual AI prompts and responses used during development, or links to the original public conversations.

Important:
- Do not invent conversations.
- Do not generate summaries and present them as raw chat logs.
- Preserve actual prompts and responses.
- If raw logs are not available, clearly document that limitation rather than fabricating them.
- Do not include secrets, credentials, or private information in published logs.

Add a section titled exactly:

## My AI Usage

Include:
- AI tools actually used.
- Tasks for which each tool was used.
- Examples of AI assistance with planning, testing, coding, debugging, or documentation.
- How the generated suggestions were reviewed and verified.
- What was modified or rejected.
- A truthful reflection on how AI affected the workflow.

Do not claim manual implementation or testing that did not occur.

## 10. GIT REQUIREMENTS

Prepare the project for Git and GitHub.

Create a suitable .gitignore covering:
- Python virtual environments.
- Python cache files.
- Environment files containing secrets.
- Node dependencies.
- Build outputs.
- Local database files when they contain development data.

Do not commit secrets.

The assignment requires AI co-author trailers for AI-assisted commits.

Use the required format when creating AI-assisted commits:

Co-authored-by: ChatGPT <AI@users.noreply.github.com>

Only use that identity if it is appropriate for the AI tool's required co-author identity.

Write descriptive commit messages that accurately represent the changes.

Do not fabricate historical commits or claim that a Red-Green-Refactor cycle occurred if it did not.

If Git is already initialized, preserve the existing history.

Do not publish the repository or push to a remote without the user's authorization.

## 11. README.md

Create a comprehensive README containing:

1. Project overview.
2. Features.
3. Technology stack.
4. Project structure.
5. Prerequisites.
6. Backend installation instructions.
7. Frontend installation instructions.
8. Database setup.
9. Environment variable configuration.
10. Instructions for creating an Admin account.
11. Instructions for running the backend.
12. Instructions for running the frontend.
13. API endpoint documentation.
14. Authentication and authorization details.
15. Instructions for running tests.
16. Actual test results.
17. Screenshots of the application.
18. Known limitations.
19. A section titled "My AI Usage".

Make the instructions suitable for someone running the project on Windows 11.

Do not invent screenshots or test reports.

Create the screenshots directory and explain how to capture the real application if screenshots cannot be captured automatically.

## 12. SECURITY AND CONFIGURATION

- Keep JWT secrets in environment variables.
- Provide an .env.example containing placeholders only.
- Never commit real secrets.
- Hash passwords.
- Validate request data.
- Enforce role-based permissions on the backend.
- Use parameterized ORM/database operations.
- Prevent negative inventory.
- Prevent concurrent purchases from overselling stock.
- Configure CORS appropriately for development.
- Do not expose password hashes in API responses.

Use reasonable development defaults without embedding production secrets.

## 13. IMPLEMENTATION ORDER

Work in this order:

Phase 1:
- Inspect the repository.
- Set up the backend.
- Configure SQLite.
- Create database models.
- Set up pytest.
- Write and run the first failing tests.

Phase 2:
- Implement authentication.
- Write tests before implementation.
- Implement vehicle listing and search.
- Implement Admin vehicle management.
- Implement purchasing and restocking.
- Run the backend test suite.

Phase 3:
- Set up React, Vite, and Tailwind CSS.
- Build login and registration.
- Build the inventory dashboard.
- Integrate the backend.
- Add Admin controls.
- Verify the complete user workflow.

Phase 4:
- Fix integration problems.
- Run the complete test suite.
- Verify that the application starts successfully.
- Complete README.md.
- Prepare PROMPTS.md.
- Check .gitignore.
- Prepare screenshots and the test report.

Do not spend time implementing optional features until all mandatory requirements work.

## 14. FINAL ACCEPTANCE CRITERIA

The project is ready for submission only when:

- The backend starts successfully.
- The React frontend starts successfully.
- SQLite persists application data.
- Registration and login work.
- JWT authentication works.
- All required API endpoints are implemented.
- Admin-only operations are protected.
- Vehicle searching works.
- Purchasing and restocking work.
- Stock cannot become negative.
- The frontend communicates with the actual backend.
- Required backend tests have been run.
- README.md is complete.
- PROMPTS.md contains genuine logs or links.
- The My AI Usage section is present.
- No secrets are committed.
- Remaining limitations are documented honestly.

## 15. HOW TO WORK WITH ME

I am working under a tight deadline and need practical implementation rather than lengthy explanations.

Start by inspecting the existing project.

Then:
1. Give me a concise summary of what already exists.
2. Identify missing requirements.
3. Begin implementing the highest-priority missing functionality.
4. Show me the exact terminal commands needed on Windows 11.
5. Explain any manual steps I need to perform.
6. Run tests and verify the implementation where possible.
7. Report what is complete, what passed, what failed, and what remains.

Do not stop after producing a plan. Work directly on the project files.

Do not ask unnecessary questions. Make reasonable, simple decisions consistent with the requirements.

The priority is to deliver a functional, tested, understandable application before the deadline.
