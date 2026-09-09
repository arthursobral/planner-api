def test_login_com_credenciais_corretas(client):
    resp = client.post("/auth/login", data={"username": "teste", "password": "teste-senha"})
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"


def test_login_com_senha_errada(client):
    resp = client.post("/auth/login", data={"username": "teste", "password": "senha-errada"})
    assert resp.status_code == 401


def test_endpoint_protegido_exige_token(client):
    resp = client.get("/pessoas")
    assert resp.status_code == 401
