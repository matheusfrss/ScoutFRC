from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import json
import os

app = Flask(__name__)
CORS(app)

# conexão com SQLite - CAMINHO ABSOLUTO
def get_db_connection():
    # caminho absoluto para garantir
    db_path = os.path.join(os.path.dirname(__file__), 'scout.db')
    print(f"📂 Tentando abrir banco em: {db_path}")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Criar tabela automaticamente
def criar_tabela():
    try:
        conn = get_db_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS robos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                num_equipe INTEGER NOT NULL,
                dados_json TEXT NOT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        print("✅ Tabela 'robos' criada/verificada com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")

# Rota para salvar (retorna id do registro criado)
@app.route('/api/salvar_robo', methods=['POST'])
def salvar_robo():
    try:
        dados = request.get_json()
        print("📝 Dados recebidos:", dados)
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?)',
            (dados.get('numEquipe', 0), json.dumps(dados))
        )
        conn.commit()
        new_id = cur.lastrowid
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

        conn.close()
        return jsonify({"status": "sucesso", "inserted": len(inserted_ids), "ids": inserted_ids}), 201
    except Exception as e:
        print("❌ Erro em import_many:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# Rota para pegar todos robôs
@app.route('/api/todos_robos', methods=['GET'])
def todos_robos():
    try:
        conn = get_db_connection()
        robos = conn.execute('SELECT * FROM robos ORDER BY data_criacao DESC').fetchall()
        conn.close()
        
        lista_robos = []
        for robo in robos:
            # dados_json armazena o payload original
            try:
                dados_parsed = json.loads(robo['dados_json'])
            except Exception:
                dados_parsed = {}
            lista_robos.append({
                'id': robo['id'],
                'num_equipe': robo['num_equipe'],
                'dados': dados_parsed,
                'data_criacao': robo['data_criacao']
            })
        
        return jsonify(lista_robos)
    except Exception as e:
        print("❌ Erro em todos_robos:", e)
        return jsonify({"status": "erro", "message": str(e)}), 500

# Health check
@app.route('/api/health')
def health():
    return jsonify({"status": "online", "message": "Flask + SQLite funcionando!"})

# Rota para debug - ver todos os dados
@app.route('/api/debug')
def debug_dados():
    try:
        conn = get_db_connection()
        robos = conn.execute('SELECT * FROM robos ORDER BY id DESC').fetchall()
        conn.close()
        
        lista = []
        for robo in robos:
            try:
                dados_parsed = json.loads(robo['dados_json'])
            except Exception:
                dados_parsed = {}
            lista.append({
                'id': robo['id'],
                'num_equipe': robo['num_equipe'],
                'dados': dados_parsed,
                'data_criacao': robo['data_criacao']
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
