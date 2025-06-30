import logging
import base64

from fastapi import FastAPI, HTTPException, status, Query
from pydantic import BaseModel, Field


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Unstructured.io Legal Document Service",
    description="API for legal document parsing and OCR with Unstructured.io",
    version="0.1.0"
)

""" Data structures of the request and the response"""
class ParseRequest(BaseModel):
    file_name: str
    input_base64: str


class ParseResponse(BaseModel):
    text: str


"""Handling the POST /parse_documents request"""
@app.post("/parse_documents", response_model=ParseResponse)
async def search_documents(request: ParseRequest):

    """ First we decode the file from base64 back to the original binary"""
    decoded_file = base64.b64decode(request.input_base64)

    try:
        with open(request.file_name, "wb") as f:
            f.write(decoded_file)

        print("successfully converted input to file")

    except IOError as e:
        print(f"Error writing file: {e}")


    """ Now we call the unstructured.io library to parse the document"""

    text = ''




    """ Return a response with the data from unstructured.io"""

    return ParseResponse(
        text: text
    )
