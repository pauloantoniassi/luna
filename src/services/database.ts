import { DataSource } from "typeorm";
import getProjectRootDir from "../utils/getProjectRootDir";
import path from "path";
import { Chat } from "../entities/Chat";
import { Contact } from "../entities/Contact";
import { Message } from "../entities/Message";

const rootDir = getProjectRootDir();

/**
 * DataSource do TypeORM para o banco de dados SQLite.
 *
 * Configurações:
 * - `type: 'sqlite'`: Especifica o uso do SQLite.
 * - `database`: Define o caminho do arquivo do banco de dados.
 * - `synchronize: true`: Sincroniza o esquema do banco de dados com as entidades. Ótimo para desenvolvimento,
 * mas use migrations em produção.
 * - `entities`: Lista de todas as classes de entidade que o TypeORM deve carregar.
 */
export const AppDataSource = new DataSource({
    type: "sqlite",
    database: path.join(rootDir, "luna.db"),
    synchronize: true, // ATENÇÃO: Usar apenas em desenvolvimento.
    logging: false, // Mude para true para ver as queries SQL geradas
    entities: [
        Chat,
        Contact,
        Message
    ],
    migrations: [],
    subscribers: [],
});

/**
 * Inicializa a conexão com o banco de dados.
 * Deve ser chamado na inicialização da aplicação.
 */
export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log("Conexão com o banco de dados inicializada com sucesso!");
    } catch (error) {
        console.error("Erro ao inicializar a conexão com o banco de dados:", error);
        process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
    }
};
