from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import sqlite3
import json
import os

app = Flask(__name__)
CORS(app)

# Conexão com SQLite - CAMINHO ABSOLUTO
def get_db_connection():
    # Caminho absoluto para garantir
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

# Rota para salvar robô
@app.route('/api/salvar_robo', methods=['POST'])
def salvar_robo():
    try:
        dados = request.json
        print("📝 Dados recebidos:", dados)
        
        conn = get_db_connection()
        conn.execute(
            'INSERT INTO robos (num_equipe, dados_json) VALUES (?, ?)',
            (dados.get('numEquipe', 0), json.dumps(dados))
        )
        conn.commit()
        conn.close()
        
        return jsonify({"status": "sucesso", "message": "Robô salvo no banco!"})
    except Exception as e:
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
            lista_robos.append({
                'id': robo['id'],
                'num_equipe': robo['num_equipe'],
                'dados': json.loads(robo['dados_json'])
            })
        
        return jsonify(lista_robos)
    except Exception as e:
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
            lista.append({
                'id': robo['id'],
                'num_equipe': robo['num_equipe'],
                'dados': json.loads(robo['dados_json'])
            })
        
        return jsonify({"total": len(lista), "robos": lista})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# Servir frontend
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