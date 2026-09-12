from src.main import app

if __name__ == '__main__':
    # Adicionando o host '0.0.0.0' para escutar todas as interfaces de rede
    app.run(host='0.0.0.0', debug=True)
