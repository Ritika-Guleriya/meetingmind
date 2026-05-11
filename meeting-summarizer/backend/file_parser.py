"""
File parser module for extracting text from various file formats.
Supports: .txt, .pdf, .docx
"""

import fitz  # PyMuPDF
from docx import Document
from fastapi import UploadFile, HTTPException


async def parse_file(file: UploadFile) -> str:
    """
    Parse uploaded file and extract text.
    
    Args:
        file: UploadFile object from FastAPI
        
    Returns:
        Extracted text as a string
        
    Raises:
        HTTPException: If file type is unsupported
    """
    
    # Get file extension
    file_extension = file.filename.split('.')[-1].lower()
    
    # Read file content
    content = await file.read()
    
    try:
        if file_extension == 'txt':
            # Simple UTF-8 decoding for text files
            text = content.decode('utf-8')
            return text
        
        elif file_extension == 'pdf':
            # Extract text from PDF using PyMuPDF
            pdf_document = fitz.open(stream=content, filetype='pdf')
            text = ""
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text += page.get_text()
            pdf_document.close()
            return text
        
        elif file_extension == 'docx':
            # Extract text from DOCX using python-docx
            from io import BytesIO
            doc = Document(BytesIO(content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        
        else:
            # Unsupported file type
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: .{file_extension}. Supported types: txt, pdf, docx"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing file: {str(e)}"
        )
