# backend/app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
import sqlite3

# opcional: psycopg2 para Postgres (Supabase)
try:
    import psycopg2
    import psycopg2.extras
except Exception:
    psycopg2 = None

load_dotenv()  # carrega .env local se existir

app = Flask(__name__, static_folder=None)
CORS(app)

# =============================================================
# CONFIG
# =============================================================
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
app.config["SECRET_KEY"] = SECRET_KEY

USE_POSTGRES = bool(DATABASE_URL) and (DATABASE_URL.startswith("postgres") or DATABASE_URL.startswith("postgresql"))
print("🔧 Config:", {
    "DATABASE_URL": DATABASE_URL if DATABASE_URL else "sqlite (local)",
    "USE_POSTGRES": USE_POSTGRES
})

# =============================================================
# CONEXÃO COM BANCO
# =============================================================
def get_sqlite_path():
    return os.path.join(os.path.dirname(__file__), "scout.db")

def get_db_connection():
    """Retorna uma conexão com o banco (Postgres ou SQLite)."""
    if USE_POSTGRES:
        if not psycopg2:
            raise RuntimeError("psycopg2 não está instalado, mas DATABASE_URL está configurado para Postgres.")
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
        return conn
    else:
        db_path = get_sqlite_path()
        conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        conn.row_factory = sqlite3.Row
        return conn

# =============================================================
# FUNÇÕES AUXILIARES
# =============================================================
def deep_merge(a, b):
    """Faz merge recursivo de dicionários."""
    if not isinstance(a, dict):
        a = {}
    if not isinstance(b, dict):
        return a
    for k, v in b.items():
        if k in a and isinstance(a[k], dict) and isinstance(v, dict):
            a[k] = deep_merge(a[k], v)
        else:
            a[k] = v
    return a

# =============================================================
# CRIAÇÃO AUTOMÁTICA DE TABELA
# =============================================================
def criar_tabela():
    try:
        if USE_POSTGRES:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS robos (
                    id SERIAL PRIMARY KEY,
                    num_equipe INTEGER,
                    dados_json JSONB NOT NULL,
                    estrategia TEXT,
                    observacoes TEXT,
                    data_criacao TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            conn.commit()
            cur.close()
            conn.close()
            print("✅ Tabela 'robos' criada/verificada (Postgres).")
        else:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS robos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    num_equipe INTEGER,
                    dados_json TEXT NOT NULL,
                    estrategia TEXT,
                    observacoes TEXT,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            conn.close()
            print("✅ Tabela 'robos' criada/verificada (SQLite).")
    except Exception as e:
        print("❌ Erro ao criar tabela:", e)

# =============================================================
# ENDPOINTS
# =============================================================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "db": "postgres" if USE_POSTGRES else "sqlite"})

# -------------------------------------------------------------
@app.route('/api/salvar_robo', methods=['POST'])
def salvar_robo():
    try:
        dados = request.get_json(force=True)
        print("📝 Dados recebidos (salvar_robo):", dados)

        num_equipe = dados.get('numEquipe') or dados.get('num_equipe') or None
        try:
            if num_equipe is not None:
                num_equipe = int(num_equipe)
        except Exception:
            num_equipe = None

        if USE_POSTGRES:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO robos (num_equipe, dados_json) VALUES (%s, %s) RETURNING id;",
                (num_equipe, psycopg2.extras.Json(dados))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
        else:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?);",
                (num_equipe, json.dumps(dados))
            )
            new_id = cur.lastrowid
            conn.commit()
            conn.close()

        return jsonify({"status": "sucesso", "message": "Robô salvo no banco!", "id": new_id}), 201
    except Exception as e:
        print("❌ Erro em salvar_robo:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# -------------------------------------------------------------
@app.route('/api/import', methods=['POST'])
def import_many():
    try:
        items = request.get_json(force=True)
        if not isinstance(items, list):
            return jsonify({"status": "erro", "message": "esperado um array de objetos"}), 400

        inserted_ids = []
        if USE_POSTGRES:
            conn = get_db_connection()
            cur = conn.cursor()
            try:
                for item in items:
                    num_equipe = item.get('numEquipe') or item.get('num_equipe') or None
                    cur.execute(
                        "INSERT INTO robos (num_equipe, dados_json) VALUES (%s, %s) RETURNING id;",
                        (num_equipe, psycopg2.extras.Json(item))
                    )
                    inserted_ids.append(cur.fetchone()[0])
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cur.close()
                conn.close()
        else:
            conn = get_db_connection()
            cur = conn.cursor()
            try:
                for item in items:
                    num_equipe = item.get('numEquipe') or item.get('num_equipe') or None
                    cur.execute(
                        "INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?);",
                        (num_equipe, json.dumps(item))
                    )
                    inserted_ids.append(cur.lastrowid)
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        return jsonify({"status": "sucesso", "inserted": len(inserted_ids), "ids": inserted_ids}), 201
    except Exception as e:
        print("❌ Erro em import_many:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# -------------------------------------------------------------
@app.route('/api/todos_robos', methods=['GET'])
def todos_robos():
    try:
        lista = []
        if USE_POSTGRES:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute('SELECT * FROM robos ORDER BY data_criacao DESC;')
            rows = cur.fetchall()
            cur.close()
            conn.close()
            for row in rows:
                lista.append({
                    'id': row['id'],
                    'num_equipe': row.get('num_equipe'),
                    'dados': row.get('dados_json'),
                    'estrategia': row.get('estrategia'),
                    'observacoes': row.get('observacoes'),
                    'data_criacao': row.get('data_criacao').isoformat() if row.get('data_criacao') else None
                })
        else:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('SELECT * FROM robos ORDER BY data_criacao DESC;')
            rows = cur.fetchall()
            conn.close()
            for row in rows:
                try:
                    dados_parsed = json.loads(row['dados_json']) if row['dados_json'] else {}
                except Exception:
                    dados_parsed = {}
                lista.append({
                    'id': row['id'],
                    'num_equipe': row['num_equipe'],
                    'dados': dados_parsed,
                    'estrategia': row['estrategia'],
                    'observacoes': row['observacoes'],
                    'data_criacao': row['data_criacao']
                })

        return jsonify(lista)
    except Exception as e:
        print("❌ Erro em todos_robos:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# -------------------------------------------------------------
@app.route('/api/atualizar_robo/<int:robo_id>', methods=['PUT'])
def atualizar_robo(robo_id):
    """Atualiza um robô existente (merge dos dados e campos extras)."""
    try:
        payload = request.get_json(force=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "erro", "message": "payload inválido"}), 400

        if USE_POSTGRES:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM robos WHERE id = %s;", (robo_id,))
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                return jsonify({"status": "erro", "message": "Registro não encontrado"}), 404

            existing = row['dados_json'] if isinstance(row['dados_json'], dict) else json.loads(row['dados_json'])
            merged = deep_merge(existing, payload.get('dados', {}))

            cur.execute(
                "UPDATE robos SET dados_json=%s, estrategia=%s, observacoes=%s, num_equipe=%s WHERE id=%s;",
                (psycopg2.extras.Json(merged),
                 payload.get('estrategia', row.get('estrategia')),
                 payload.get('observacoes', row.get('observacoes')),
                 payload.get('num_equipe', row.get('num_equipe')),
                 robo_id)
            )
            conn.commit()
            cur.close()
            conn.close()
        else:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM robos WHERE id = ?;", (robo_id,))
            row = cur.fetchone()
            if not row:
                conn.close()
                return jsonify({"status": "erro", "message": "Registro não encontrado"}), 404

            existing = json.loads(row['dados_json']) if row['dados_json'] else {}
            merged = deep_merge(existing, payload.get('dados', {}))
            cur.execute(
                "UPDATE robos SET dados_json=?, estrategia=?, observacoes=?, num_equipe=? WHERE id=?;",
                (json.dumps(merged),
                 payload.get('estrategia', row['estrategia']),
                 payload.get('observacoes', row['observacoes']),
                 payload.get('num_equipe', row['num_equipe']),
                 robo_id)
            )
            conn.commit()
            conn.close()

        return jsonify({"status": "sucesso", "message": "Robô atualizado com sucesso!"})
    except Exception as e:
        print("❌ Erro em atualizar_robo:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# -------------------------------------------------------------
@app.route('/api/debug', methods=['GET'])
def debug_dados():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM robos ORDER BY id DESC;")
        rows = cur.fetchall()
        conn.close()
        lista = []
        for r in rows:
            try:
                dados_parsed = json.loads(r['dados_json']) if r['dados_json'] else {}
            except Exception:
                dados_parsed = {}
            lista.append({
                'id': r['id'],
                'num_equipe': r['num_equipe'],
                'dados': dados_parsed,
                'estrategia': r['estrategia'],
                'observacoes': r['observacoes'],
                'data_criacao': r['data_criacao']
            })
        return jsonify({"total": len(lista), "robos": lista})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# =============================================================
# FRONTEND
# =============================================================
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

# =============================================================
# MAIN
# =============================================================
if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask...")
    criar_tabela()
    print("✅ Servidor pronto! Acesse: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
