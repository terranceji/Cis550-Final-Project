To run backend, make sure u first 

```bash
cd backend
```

then install the dependencies and activate the virtual environment by running the following commands

```bash
poetry install
poetry shell
```

then run the following command to start the backend server

```bash
cd backend
uvicorn main:app --reload
```

the backend server should be running, to test endpoints, put /docs at the end of the url to see the swagger documentation. 
