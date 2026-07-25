import { getPool, withTransaction } from '../db/client.js';

function mapAsset(row = {}) {
  return {
    id: row.id,
    ownerId: row.owner_id || row.ownerId,
    originalItemId: row.original_item_id || row.originalItemId,
    type: row.type,
    title: row.title,
    content: row.content || '',
    citation: row.citation || {},
    tags: row.tags || [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function mapDocument(row = {}) {
  return {
    id: row.id,
    ownerId: row.owner_id || row.ownerId,
    title: row.title,
    draftContent: row.draft_content || row.draftContent || '',
    status: row.status || 'draft',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function mapVersion(row = {}) {
  return {
    id: row.id,
    documentId: row.document_id || row.documentId,
    number: row.version_number || row.number,
    clientOperationId: row.client_operation_id || row.clientOperationId,
    title: row.title,
    content: row.content || '',
    assetIds: row.asset_ids || row.assetIds || [],
    citations: row.citations || [],
    reason: row.reason,
    createdAt: row.created_at || row.createdAt,
  };
}

async function queryDocument(db, documentId) {
  const { rows } = await db.query('select * from creation_documents where id = $1', [documentId]);
  return rows[0] ? mapDocument(rows[0]) : null;
}

export function createCreativeRepository(db = getPool()) {
  return {
    async getState(userId) {
      const [assets, documents, versions] = await Promise.all([
        db.query('select * from creation_assets where owner_id = $1 order by updated_at desc, created_at desc', [userId]),
        db.query('select * from creation_documents where owner_id = $1 order by updated_at desc, created_at desc', [userId]),
        db.query(
          `select v.* from creation_versions v
           join creation_documents d on d.id = v.document_id
           where d.owner_id = $1
           order by v.created_at desc, v.version_number desc`,
          [userId],
        ),
      ]);
      return {
        assets: assets.rows.map(mapAsset),
        documents: documents.rows.map(mapDocument),
        versions: versions.rows.map(mapVersion),
      };
    },

    getDocument(documentId) {
      return queryDocument(db, documentId);
    },

    async listVersions(documentId) {
      const { rows } = await db.query(
        'select * from creation_versions where document_id = $1 order by version_number desc, created_at desc',
        [documentId],
      );
      return rows.map(mapVersion);
    },

    async upsertAsset(userId, asset) {
      const idColumns = asset.id ? 'id,' : '';
      const idValues = asset.id ? '$2,' : '';
      const offset = asset.id ? 1 : 0;
      const values = asset.id
        ? [userId, asset.id, asset.originalItemId, asset.type, asset.title, asset.content, JSON.stringify(asset.citation), JSON.stringify(asset.tags)]
        : [userId, asset.originalItemId, asset.type, asset.title, asset.content, JSON.stringify(asset.citation), JSON.stringify(asset.tags)];
      const { rows } = await db.query(
        `insert into creation_assets(owner_id, ${idColumns} original_item_id, type, title, content, citation, tags)
         values ($1, ${idValues} $${2 + offset}, $${3 + offset}, $${4 + offset}, $${5 + offset}, $${6 + offset}, $${7 + offset})
         on conflict (owner_id, original_item_id) do update set
           type = excluded.type,
           title = excluded.title,
           content = excluded.content,
           citation = excluded.citation,
           tags = excluded.tags,
           updated_at = now()
         returning *`,
        values,
      );
      return mapAsset(rows[0]);
    },

    async upsertDocument(userId, document) {
      if (document.id) {
        const { rows } = await db.query(
          `insert into creation_documents(id, owner_id, title, draft_content, status)
           values ($1,$2,$3,$4,$5)
           on conflict (id) do update set
             title = excluded.title,
             draft_content = excluded.draft_content,
             status = excluded.status,
             updated_at = now()
           where creation_documents.owner_id = excluded.owner_id
           returning *`,
          [document.id, userId, document.title, document.draftContent, document.status],
        );
        return rows[0] ? mapDocument(rows[0]) : null;
      }
      const { rows } = await db.query(
        `insert into creation_documents(owner_id, title, draft_content, status)
         values ($1,$2,$3,$4) returning *`,
        [userId, document.title, document.draftContent, document.status],
      );
      return mapDocument(rows[0]);
    },

    async appendVersion(userId, version) {
      return withTransaction(async client => {
        const document = await queryDocument(client, version.documentId);
        if (!document || String(document.ownerId) !== String(userId)) return null;

        const existing = await client.query(
          'select * from creation_versions where document_id = $1 and client_operation_id = $2',
          [version.documentId, version.clientOperationId],
        );
        if (existing.rows[0]) return mapVersion(existing.rows[0]);

        const current = await client.query(
          'select coalesce(max(version_number), 0)::int as number from creation_versions where document_id = $1',
          [version.documentId],
        );
        const nextNumber = Number(current.rows[0]?.number || 0) + 1;
        const idColumns = version.id ? 'id,' : '';
        const idValues = version.id ? '$2,' : '';
        const offset = version.id ? 1 : 0;
        const values = version.id
          ? [version.documentId, version.id, nextNumber, version.clientOperationId, version.title, version.content, JSON.stringify(version.assetIds), JSON.stringify(version.citations), version.reason]
          : [version.documentId, nextNumber, version.clientOperationId, version.title, version.content, JSON.stringify(version.assetIds), JSON.stringify(version.citations), version.reason];
        const inserted = await client.query(
          `insert into creation_versions(document_id, ${idColumns} version_number, client_operation_id, title, content, asset_ids, citations, reason)
           values ($1, ${idValues} $${2 + offset}, $${3 + offset}, $${4 + offset}, $${5 + offset}, $${6 + offset}, $${7 + offset}, $${8 + offset})
           returning *`,
          values,
        );
        await client.query(
          'update creation_documents set title = $2, draft_content = $3, updated_at = now() where id = $1 and owner_id = $4',
          [version.documentId, version.title, version.content, userId],
        );
        return mapVersion(inserted.rows[0]);
      });
    },
  };
}
