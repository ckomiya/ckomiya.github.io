import React from "react";
import project1 from '../assets/images/llmchatbot_lp2.jpg';
import project2 from '../assets/images/denuncias_app.png';
import '../assets/styles/Project.scss';

function Project() {
    return(
    <div className="projects-container" id="projects">
        <h1>Proyectos Personales</h1>
        <div className="projects-grid">
            <div className="project">
                <a href="https://huggingface.co/spaces/ckomiya/chat_info_curso" target="_blank" rel="noreferrer"><img src={project1} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://huggingface.co/spaces/ckomiya/chat_info_curso" target="_blank" rel="noreferrer"><h2>LLM Chatbot</h2></a>
                <p>Chatbot que responde preguntas sobre el curso de Lenguaje de Programación II, dictado en Cibertec, utilizando un enfoque RAG (Retrieval-Augmented Generation) con PDF como fuente. Desarrollado con OpenAI GPT-3.5 Turbo, LangChain, Streamlit y Python.</p>
            </div>
            <div className="project">
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><img src={project2} className="zoom" alt="thumbnail" width="100%"/></a>
                <a href="https://yujisatojr.itch.io/highspeedchase" target="_blank" rel="noreferrer"><h2>Denuncias Perú Dashboard</h2></a>
                <p>Aplicación interactiva construida con Streamlit que permite visualizar datos de denuncias policiales del Perú. Carga el CSV oficial desde Datos Abiertos y muestra en un mapa las denuncias por distrito según año y modalidad. También incluye un gráfico de evolución anual por departamento con opción de filtrado. Se utilizaron las librerías pandas, streamlit y folium. Fuente oficial: <a href="https://datosabiertos.gob.pe/dataset/denuncias-policiales-0">datosabiertos.gob.pe/dataset/denuncias-policiales‑0</a>.</p>
            </div>
        </div>
    </div>
    );
}

export default Project;