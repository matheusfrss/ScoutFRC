# backend/app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import psycopg2
import json
import os
from dotenv import load_dotenv

load_dotenv()  # carrega .env local

app = Flask(__name__)
CORS(app)

# CONFIG
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
app.config["SECRET_KEY"] = SECRET_KEY

IS_POSTGRES = bool(DATABASE_URL and DATABASE_URL.startswith("postgres"))

# Conexão dinâmica: Postgres (psycopg2 + ssl) ou SQLite local
def get_db_connection():
    try:
        if IS_POSTGRES:
            print("📡 Conectando ao banco PostgreSQL (Supabase)...")
            # usar sslmode=require para Supabase
            conn = psycopg2.connect(DATABASE_URL, sslmode="require")
            return conn
        else:
            db_path = os.path.join(os.path.dirname(__file__), "scout.db")
            print(f"💾 Conectando SQLite local: {db_path}")
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            return conn
    except Exception as e:
        print(f"❌ Erro ao conectar no banco: {e}")
        raise

# Helper: cria tabela com SQL apropriado para cada DB
def criar_tabela():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if IS_POSTGRES:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS robos (
                    id SERIAL PRIMARY KEY,
                    num_equipe INTEGER NOT NULL,
                    dados_json TEXT NOT NULL,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ''')
        else:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS robos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    num_equipe INTEGER NOT NULL,
                    dados_json TEXT NOT NULL,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Tabela 'robos' criada/verificada com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")

# ===== ROTAS =====

# Rota para salvar (retorna id do registro criado)
@app.route('/api/salvar_robo', methods=['POST'])
def salvar_robo():
    try:
        dados = request.get_json()
        print("📝 Dados recebidos:", dados)

        conn = get_db_connection()
        cur = conn.cursor()

        if IS_POSTGRES:
            # usar RETURNING id para obter o id gerado
            cur.execute(
                'INSERT INTO robos (num_equipe, dados_json) VALUES (%s, %s) RETURNING id;',
                (dados.get('numEquipe', 0), json.dumps(dados))
            )
            new_id = cur.fetchone()[0]
        else:
            cur.execute(
                'INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?)',
                (dados.get('numEquipe', 0), json.dumps(dados))
            )
            new_id = cur.lastrowid

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "sucesso", "message": "Robô salvo no banco!", "id": new_id}), 201
    except Exception as e:
        print("❌ Erro em salvar_robo:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# Endpoint batch para importar vários itens de uma vez
@app.route('/api/import', methods=['POST'])
def import_many():
    """
    Recebe um array de objetos e insere todos na tabela 'robos' dentro de uma transação.
    Retorna quantos foram inseridos e os ids criados.
    """
    try:
        items = request.get_json()
        if not isinstance(items, list):
            return jsonify({"status": "erro", "message": "esperado um array de objetos"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        inserted_ids = []
        try:
            if IS_POSTGRES:
                for item in items:
                    cur.execute(
                        'INSERT INTO robos (num_equipe, dados_json) VALUES (%s, %s) RETURNING id;',
                        (item.get('numEquipe', 0), json.dumps(item))
                    )
                    inserted_ids.append(cur.fetchone()[0])
            else:
                for item in items:
                    cur.execute(
                        'INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?)',
                        (item.get('numEquipe', 0), json.dumps(item))
                    )
                    inserted_ids.append(cur.lastrowid)

            conn.commit()
        except Exception as e:
            conn.rollback()
            print("❌ Erro durante import_many transaction:", e)
            raise
        finally:
            cur.close()
            conn.close()

        return jsonify({"status": "sucesso", "inserted": len(inserted_ids), "ids": inserted_ids}), 201
    except Exception as e:
        print("❌ Erro em import_many:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# Helper para executar SELECT e retornar linhas padronizadas
def fetch_all_robos(conn):
    rows_out = []
    try:
        cur = conn.cursor()
        if IS_POSTGRES:
            cur.execute('SELECT id, num_equipe, dados_json, data_criacao FROM robos ORDER BY data_criacao DESC;')
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            for r in rows:
                # r é tupla; construir dict por indice
                rowdict = dict(zip(cols, r))
                rows_out.append(rowdict)
        else:
            cur = conn.cursor()
            cur.execute('SELECT * FROM robos ORDER BY data_criacao DESC')
            rows = cur.fetchall()
            # sqlite3.Row permite indexação por nome
            for r in rows:
                rows_out.append({
                    "id": r["id"],
                    "num_equipe": r["num_equipe"],
                    "dados_json": r["dados_json"],
                    "data_criacao": r["data_criacao"]
                })
        cur.close()
    except Exception as e:
        print("❌ Erro em fetch_all_robos:", e)
        raise
    return rows_out

# Rota para pegar todos robôs
@app.route('/api/todos_robos', methods=['GET'])
def todos_robos():
    try:
        conn = get_db_connection()
        raw_rows = fetch_all_robos(conn)
        # se conexao psycopg2, precisamos fechar tambem
        try:
            conn.close()
        except Exception:
            pass

        lista_robos = []
        for robo in raw_rows:
            # dados_json armazena o payload original (pode ser string)
            dados_json = robo.get("dados_json") if "dados_json" in robo else robo.get("dados")
            try:
                parsed = json.loads(dados_json) if isinstance(dados_json, str) else (dados_json or {})
            except Exception:
                parsed = {}
            lista_robos.append({
                'id': robo.get('id'),
                'num_equipe': robo.get('num_equipe'),
                'dados': parsed,
                'data_criacao': robo.get('data_criacao')
            })

        return jsonify(lista_robos)
    except Exception as e:
        print("❌ Erro em todos_robos:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# Health check
@app.route('/api/health')
def health():
    db_type = "Postgres" if IS_POSTGRES else "SQLite"
    return jsonify({"status": "online", "db": db_type})

# Rota para debug - ver todos os dados
@app.route('/api/debug')
def debug_dados():
    try:
        conn = get_db_connection()
        raw_rows = fetch_all_robos(conn)
        try:
            conn.close()
        except Exception:
            pass

        lista = []
        for robo in raw_rows:
            dados_json = robo.get("dados_json") if "dados_json" in robo else robo.get("dados")
            try:
                parsed = json.loads(dados_json) if isinstance(dados_json, str) else (dados_json or {})
            except Exception:
                parsed = {}
            lista.append({
                'id': robo.get('id'),
                'num_equipe': robo.get('num_equipe'),
                'dados': parsed,
                'data_criacao': robo.get('data_criacao')
            })

        return jsonify({"total": len(lista), "robos": lista})
    except Exception as e:
        print("❌ Erro em debug_dados:", e)
        return jsonify({"erro": str(e)}), 500

# Servir frontend (ajuste o caminho relativo se necessário)
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

# Inicializar
if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask...")
    criar_tabela()
    print("✅ Servidor pronto! Acesse: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
