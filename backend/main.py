# Importações necessárias do FastAPI e outras bibliotecas
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import os
import logging
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- Novas importações para RAG e OpenAI ---
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough

# Importações específicas da OpenAI
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
# --- Fim das novas importações ---

# Configura o logger para exibir mensagens no console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Carrega e verifica a OPENAI_API_KEY
openai_api_key_env = os.getenv("OPENAI_API_KEY")
if not openai_api_key_env:
    logging.error("OPENAI_API_KEY não encontrada nas variáveis de ambiente.")
    raise ValueError("OPENAI_API_KEY não encontrada. Por favor, configure-a no arquivo .env.")

# Inicializa o aplicativo FastAPI
app = FastAPI()

# --- Configuração do CORS para permitir requisições do frontend ---
# Para o desenvolvimento local, permitir todas as origens é uma prática comum.
# Em produção, você deve substituir "*" pela URL do seu frontend.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Fim da configuração do CORS ---

# --- Variáveis globais para RAG ---
# Estas variáveis serão inicializadas na startup da aplicação
vectorstore = None
retriever = None
llm = None
chain = None
# --- Fim das variáveis globais ---

# Função para carregar, processar e armazenar documentos para RAG
def load_and_process_documents(directory_path: str):
    """
    Carrega documentos de um diretório, divide-os, cria embeddings
    e os armazena em um vetor store Chroma.
    """
    global vectorstore, retriever, llm, chain  # Declarar como global para modificar

    logging.info(f"Iniciando carregamento e processamento de documentos do diretório: {directory_path}")

    try:
        # 1. Carregar documentos (ex: PDFs)
        documents = []
        for filename in os.listdir(directory_path):
            if filename.endswith(".pdf"):
                file_path = os.path.join(directory_path, filename)
                logging.info(f"Carregando PDF: {file_path}")
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())
        
        if not documents:
            logging.warning("Nenhum documento PDF encontrado para carregar. O RAG não será ativado.")
            return

        # 2. Dividir documentos em chunks menores
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(documents)
        logging.info(f"Documentos divididos em {len(splits)} chunks.")

        # 3. Criar embeddings (usando OpenAIEmbeddings)
        embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key_env)
        logging.info("Embeddings da OpenAI inicializados.")

        # 4. Criar e persistir o vetor store Chroma
        vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings)
        retriever = vectorstore.as_retriever()
        logging.info("Vector store Chroma criado e retriever configurado.")

        # Inicializa o modelo LLM (usando ChatOpenAI)
        # Você pode especificar outros modelos como "gpt-4" se tiver acesso
        llm = ChatOpenAI(model="gpt-3.5-turbo", openai_api_key=openai_api_key_env)
        logging.info("Modelo OpenAI (gpt-3.5-turbo) inicializado para a cadeia RAG.")

        # Define o prompt do sistema para o chatbot com contexto RAG
        system_prompt = (
            "Você é um assistente de chatbot prestativo e amigável para uma farmácia de manipulação."
            "Seu objetivo é fornecer informações precisas e úteis sobre os serviços da farmácia, produtos,"
            "horários de funcionamento, localização e como enviar receitas."
            "Mantenha as respostas concisas e diretas ao ponto."
            "Use as seguintes informações de contexto para responder à pergunta do usuário. "
            "Se a resposta não estiver no contexto fornecido, diga que você não tem informações sobre isso e peça para o usuário entrar em contato direto com a farmácia."
            "\n\nContexto: {context}"
        )

        # Cria o template do prompt
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("user", "{user_message}"),
            ]
        )

        # Função auxiliar para combinar documentos
        def combine_documents(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        # Monta a cadeia RAG
        chain = (
            RunnableParallel(
                context=retriever | combine_documents,
                user_message=RunnablePassthrough()
            )
            | prompt
            | llm
            | StrOutputParser()
        )
        logging.info("Cadeia LangChain RAG configurada.")

    except Exception as e:
        logging.error(f"Erro ao carregar e processar documentos para RAG: {e}")
        vectorstore = None
        retriever = None
        llm = None
        chain = None
        logging.error("RAG não será funcional devido ao erro de carregamento de documentos.")


# Rota para a raiz do aplicativo (apenas para verificar se está online)
@app.get("/")
async def root():
    logging.info("Requisição GET recebida na raiz.")
    return {"message": "Chatbot da Farmácia está online e aguardando mensagens!"}

# --- Endpoint para o frontend web ---
class ChatRequest(BaseModel):
    user_message: str

@app.post("/api/chat")
async def handle_chat_message(request: ChatRequest):
    logging.info(f"Requisição de chat recebida: {request.user_message}")

    if not chain:
        logging.error("A cadeia RAG não foi inicializada.")
        return {"response": "Desculpe, o sistema de conhecimento está indisponível no momento."}

    try:
        # A nova cadeia LangChain já trata a entrada de forma simples,
        # portanto, passamos a mensagem do usuário diretamente.
        bot_response = chain.invoke(request.user_message)
        logging.info(f"Resposta gerada pelo bot para o chat: {bot_response}")
        return {"response": bot_response}
    except Exception as e:
        logging.error(f"Erro ao invocar a cadeia do chatbot: {e}")
        return {"response": "Desculpe, ocorreu um erro ao processar sua solicitação."}
# --- Fim do novo endpoint ---


# Evento de startup da aplicação FastAPI
@app.on_event("startup")
async def startup_event():
    logging.info("Aplicação iniciando. Carregando documentos para RAG...")
    # O diretório 'data' deve conter os arquivos PDF
    load_and_process_documents("data")
    logging.info("Processo de carregamento de documentos concluído.")

