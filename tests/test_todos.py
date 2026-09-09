def test_criar_a_partir_de_texto_colado(client, auth_headers):
    texto = "* primeira\n\tsegunda indentada\n- [x] concluida"
    resp = client.post("/todos", json={"texto": texto}, headers=auth_headers)
    assert resp.status_code == 201
    itens = resp.json()
    assert [i["texto"] for i in itens] == ["primeira", "segunda indentada", "concluida"]
    assert itens[2]["status"] == "concluido"


def test_alternar_faz_toggle_de_concluido(client, auth_headers):
    criado = client.post("/todos", json={"texto": "- item"}, headers=auth_headers).json()[0]

    resp = client.post(f"/todos/{criado['id']}/alternar", headers=auth_headers)
    assert resp.json()["concluido"] is True

    resp = client.post(f"/todos/{criado['id']}/alternar", headers=auth_headers)
    assert resp.json()["concluido"] is False
