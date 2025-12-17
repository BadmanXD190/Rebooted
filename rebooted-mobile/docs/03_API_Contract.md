base_url: "http://localhost:3001"
authentication: supabase_jwt

endpoints:

  - name: POST /decompose
    description: >
      Creates a project, runs AI decomposition, saves tasks and dependencies.
    request:
      body:
        raw_text: string
    response:
      project: object
      tasksInserted: integer
      dependenciesInserted: integer
      plan: object

  - name: POST /schedule
    description: >
      Generates and saves schedule for a project.
    request:
      body:
        project_id: uuid
        start_date: "YYYY-MM-DD"
        horizon_days: integer
    response:
      schedule: object
      blocksInserted: integer
      plan: object

  - name: GET /projects
    description: Returns all projects for authenticated user
    response:
      projects: list

  - name: GET /tasks
    query_params:
      - project_id: uuid
    description: Returns tasks for given project

  - name: GET /schedule_blocks
    query_params:
      - project_id: uuid
      - date: "YYYY-MM-DD"
    description: Returns schedule blocks for a specific day

error_format:
  response:
    error: string
