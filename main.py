# main.py
from fastapi import FastAPI, Request, Response
from twilio.twiml.messaging_response import MessagingResponse
from dotenv import load_dotenv
import os
import logging

# --- Novas importações para RAG ---
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
# --- Fim das novas importações ---

# Configura o logger para exibir mensagens no console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Carrega e verifica a GOOGLE_API_KEY/CHATGPT
google_api_key_env = os.getenv("CHATGPT_API_KEY")
if not google_api_key_env:
    logging.error("CHATGPT_API_KEY não encontrada nas variáveis de ambiente.")
    raise ValueError("CHATGPT_API_KEY não encontrada. Por favor, configure-a no arquivo .env.")

# Inicializa o aplicativo FastAPI
app = FastAPI()

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
    global vectorstore, retriever, llm, chain # Declarar como global para modificar

    logging.info(f"Iniciando carregamento e processamento de documentos do diretório: {directory_path}")

    try:
        # 1. Carregar documentos (ex: PDFs)
        documents = []
        # Percorre todos os arquivos no diretório especificado
        for filename in os.listdir(directory_path):
            if filename.endswith(".pdf"):
                file_path = os.path.join(directory_path, filename)
                logging.info(f"Carregando PDF: {file_path}")
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())
        
        if not documents:
            logging.warning("Nenhum documento PDF encontrado para carregar. O RAG não será ativado.")
            # É importante definir vectorstore, retriever, llm e chain como None
            # se nenhum documento for carregado, para que o chatbot saiba que o RAG não está pronto.
            vectorstore = None
            retriever = None
            llm = None
            chain = None
            return

        # 2. Dividir documentos em chunks menores
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(documents)
        logging.info(f"Documentos divididos em {len(splits)} chunks.")

        # 3. Criar embeddings
        # Certifique-se de que o modelo de embedding está correto. 'models/embedding-001' é o padrão.
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=google_api_key_env)
        logging.info("Embeddings do Google Generative AI inicializados.")

        # 4. Criar e persistir o vetor store Chroma
        # Para este exemplo, o vetor store é em memória.
        # Para produção, você pode querer persistir ou usar um serviço externo.
        vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings)
        retriever = vectorstore.as_retriever()
        logging.info("Vector store Chroma criado e retriever configurado.")

        # Inicializa o modelo Gemini para a cadeia RAG
        # Usaremos 'gemini-pro' ou 'gemini-1.0-pro' para compatibilidade.
        llm = ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=google_api_key_env)
        logging.info("Modelo Chatgpt inicializado para a cadeia RAG.")

        # Define o prompt do sistema para o chatbot com contexto RAG
        # O prompt agora inclui um placeholder para o contexto recuperado
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

        # Função auxiliar para combinar documentos recuperados em uma única string
        def combine_documents(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        # A cadeia agora é mais complexa: recupera docs -> combina -> formata prompt -> invoca LLM -> parseia
        chain = (
            {"context": retriever | combine_documents, "user_message": lambda x: x["user_message"]}
            | prompt
            | llm
            | StrOutputParser()
        )
        logging.info("Cadeia LangChain RAG configurada.")

    except Exception as e:
        logging.error(f"Erro ao carregar e processar documentos para RAG: {e}")
        # Se houver um erro, certifique-se de que as variáveis globais são redefinidas para None
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

# Rota para o webhook do Twilio
@app.post("/webhook")
async def handle_whatsapp_message(request: Request):
    form_data = await request.form()
    incoming_msg = form_data.get('Body')
    sender_id = form_data.get('From')

    logging.info(f"Mensagem recebida de {sender_id}: {incoming_msg}")

    resp = MessagingResponse()

    if not incoming_msg:
        logging.warning("Mensagem vazia recebida.")
        resp.message("Desculpe, não recebi nenhuma mensagem. Poderia tentar novamente?")
        return Response(content=str(resp), media_type="application/xml")

    # Verifica se o RAG foi inicializado com sucesso
    if chain is None:
        logging.error("A cadeia RAG não foi inicializada. Respondendo com mensagem de erro.")
        resp.message("Desculpe, o sistema de conhecimento está indisponível no momento. Por favor, tente novamente mais tarde ou entre em contato direto com a farmácia.")
        return Response(content=str(resp), media_type="application/xml")

    try:
        # Chama a função do chatbot para obter a resposta (agora usando a cadeia RAG)
        # Passamos a mensagem do usuário para a cadeia
        bot_response = chain.invoke({"user_message": incoming_msg})
        logging.info(f"Resposta gerada pelo bot: {bot_response}")
        resp.message(bot_response)
    except Exception as e:
        logging.error(f"Erro ao invocar a cadeia do chatbot: {e}")
        resp.message("Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.")

    return Response(content=str(resp), media_type="application/xml")

# Evento de startup da aplicação FastAPI
@app.on_event("startup")
async def startup_event():
    logging.info("Aplicação iniciando. Carregando documentos para RAG...")
    # O caminho para a pasta 'data' dentro do contêiner Docker será '/app/data'
    # Certifique-se de que a pasta 'data' existe na raiz do seu projeto local
    # e contém os PDFs que você deseja usar.
    load_and_process_documents("/app/data")
    logging.info("Processo de carregamento de documentos concluído.")