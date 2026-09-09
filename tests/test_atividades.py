def test_criar_e_listar_atividade(client, auth_headers):
    resp = client.post("/atividades", json={"nome": "Ticket X", "prioridade": "Alta"}, headers=auth_headers)
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["status"] == "Pendente"
    assert corpo["dias_parado"] == 0
    assert corpo["faixa"] == "em-dia"

    resp = client.get("/atividades", headers=auth_headers)
    assert len(resp.json()) == 1


def test_prioridade_invalida_e_rejeitada_pelo_pydantic(client, auth_headers):
    resp = client.post("/atividades", json={"nome": "X", "prioridade": "Urgentíssima"}, headers=auth_headers)
    assert resp.status_code == 422


def test_arquivar_tira_da_lista_corrente_remover_exige_arquivar_antes(client, auth_headers):
    criada = client.post("/atividades", json={"nome": "Ticket Y", "prioridade": "Baixa"}, headers=auth_headers).json()
    id_ = criada["id"]

    client.post(f"/atividades/{id_}/arquivar", headers=auth_headers)

    correntes = client.get("/atividades", headers=auth_headers).json()
    assert all(a["id"] != id_ for a in correntes)

    arquivadas = client.get("/atividades", params={"correntes": False}, headers=auth_headers).json()
    assert any(a["id"] == id_ for a in arquivadas)

    resp = client.delete(f"/atividades/{id_}", headers=auth_headers)
    assert resp.status_code == 204

    # Restaurar desfaz a remoção, não o arquivamento — são ações independentes
    # (mesma regra do Planner v2: "reabrir" tira do arquivo, "restaurar" desfaz
    # o apagar). O item volta a aparecer na lista de arquivadas, ainda arquivado.
    resp = client.post(f"/atividades/{id_}/restaurar", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["arquivada_em"] is not None

    arquivadas = client.get("/atividades", params={"correntes": False}, headers=auth_headers).json()
    assert any(a["id"] == id_ for a in arquivadas)
