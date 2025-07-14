import React from "react";
import '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReact, faDocker, faPython, faTrello } from '@fortawesome/free-brands-svg-icons';
import Chip from '@mui/material/Chip';
import '../assets/styles/Expertise.scss';

const labelsFirst = [
    "React",
    "TypeScript",
    "JavaScript",
    "Angular",
    "HTML5",
    "CSS3",
    "Java",
    "Spring Boot",
    "Python",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "Oracle",
    "Postman",
    "Kafka",
    "RabbitMQ",
    "Redis",
    "OAuth 2.0",
    "OpenAPI",
    "Swagger",
    "DDD",
    "TDD",
    "BDD"
];

const labelsSecond = [
    "Git",
    "GitHub Actions",
    "Docker",
    "AWS",
    "Azure",
    "Linux",
    "Jenkins",
    "SonarQube",
    "Pandas",
    "Selenium",
];

const labelsThird = [
    "OpenAI",
    "LangChain",
    "Hugging Face",
    "LlamaIndex",
    "Streamlit",
];

const labelsFourth = [
    "Scrum",
    "Kanban",
    "SAFe",
    "OKRs",
    "Lean",
    "Design Thinking",
    "BDD",
    "Lean Inception"
];


function Expertise() {
    return (
    <div className="container" id="expertise">
        <div className="skills-container">
            <h1>Experiencia</h1>
            <div className="skills-grid">
                <div className="skill">
                    <FontAwesomeIcon icon={faReact} size="3x"/>
                    <h3>Full Stack Web Development</h3>
                    <p>Tengo formación y práctica en el desarrollo de sistemas web complejos, aplicando tecnologías modernas tanto en frontend como backend. En la capa frontend, he trabajado con Angular y React; en el backend, con Node.js y Spring Boot. Además, tengo un buen dominio del ciclo de vida del desarrollo de software (SDLC).</p>
                    <div className="flex-chips">
                        <span className="chip-title">Tech stack:</span>
                        {labelsFirst.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faDocker} size="3x"/>
                    <h3>DevOps & Automation</h3>
                    <p>Una vez que la aplicación está construida, ayudo a los clientes a configurar pruebas DevOps, pipelines de CI/CD y automatización de despliegues para asegurar una salida a producción exitosa.</p>
                    <div className="flex-chips">
                        <span className="chip-title">Tech stack:</span>
                        {labelsSecond.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faPython} size="3x"/>
                    <h3>GenAI & LLM</h3>
                    <p>Me mantengo al día con las últimas tendencias en inteligencia artificial generativa (GenAI) e incorporo modelos avanzados de IA en el desarrollo de soluciones que fortalecen la toma de decisiones inteligentes en entornos empresariales.</p>
                    <div className="flex-chips">
                        <span className="chip-title">Tech stack:</span>
                        {labelsThird.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>

                <div className="skill">
                    <FontAwesomeIcon icon={faTrello} size="3x"/>
                    <h3>Agile</h3>
                    <p>Tengo enfoque en metodologías Lean y Agile aplicadas al desarrollo de software y gestión de proyectos. Adopto prácticas Lean para eliminar desperdicios y optimizar procesos, mientras utilizo principios Agile para iterar de forma eficiente, priorizar el valor al cliente y fomentar la colaboración en equipos multidisciplinarios. Este enfoque combinado me permite entregar software con mayor rapidez, calidad y adaptabilidad al cambio en entornos empresariales. </p>
                    <div className="flex-chips">
                        <span className="chip-title">Metodologías y Marcos:</span>
                        {labelsFourth.map((label, index) => (
                            <Chip key={index} className='chip' label={label} />
                        ))}
                    </div>
                </div>


            </div>
        </div>
    </div>
    );
}

export default Expertise;