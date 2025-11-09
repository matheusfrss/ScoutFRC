import sqlite3
import os

def resetar_dados():
    try:
        arquivo_db = 'scout.db'
        
        if not os.path.exists(arquivo_db):
            print("❌ Arquivo scout.db não encontrado!")
            return
        
        # Conecta ao banco
        conn = sqlite3.connect(arquivo_db)
        cursor = conn.cursor()
        
        # 🔍 Verificar tabelas (excluindo sqlite_sequence)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
        tabelas = cursor.fetchall()
        
        print("📋 Tabelas encontradas no banco:")
        for tabela in tabelas:
            print(f"   - {tabela[0]}")
        
        # Conta registros
        print("\n📊 Dados atuais no banco:")
        for tabela in tabelas:
            cursor.execute(f"SELECT COUNT(*) FROM {tabela[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {tabela[0]}: {count} registros")
        
        if not tabelas:
            print("❌ Nenhuma tabela de dados encontrada!")
            conn.close()
            return
        
        confirmacao = input("\n⚠️  Tem certeza que quer resetar os dados? (s/n): ")
        
        if confirmacao.lower() != 's':
            print("❌ Reset cancelado.")
            conn.close()
            return
        
        # 🗑️ Reseta apenas tabelas de dados
        print("🔄 Resetando dados...")
        for tabela in tabelas:
            cursor.execute(f"DELETE FROM {tabela[0]}")
            print(f"   - Limpada tabela: {tabela[0]}")
        
        conn.commit()
        conn.close()
        
        print("✅ Banco de dados resetado com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro ao resetar dados: {e}")

if __name__ == "__main__":
    resetar_dados()