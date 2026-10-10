import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const editorDataPath = fileURLToPath(new URL('./src/editorData.json', import.meta.url))

function editorDataPlugin() {
  return {
    name: 'job-quest-project-editor-data',
    configureServer(server) {
      server.middlewares.use('/__job-quest/editor-data', async (request, response, next) => {
        if (request.method === 'GET') {
          try {
            const contents = await readFile(editorDataPath, 'utf8')
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(contents)
          } catch (error) {
            server.config.logger.error(`Could not read editor data: ${error.message}`)
            response.statusCode = 500
            response.end('Could not read project editor data.')
          }
          return
        }

        if (request.method !== 'PUT') {
          next()
          return
        }

        try {
          let body = ''
          for await (const chunk of request) {
            body += chunk
            if (body.length > 1_000_000) {
              response.statusCode = 413
              response.end('Editor data is too large.')
              return
            }
          }

          const data = JSON.parse(body)
          const levels = data?.levels
          if (!levels || typeof levels !== 'object' || Array.isArray(levels)) {
            response.statusCode = 400
            response.end('Invalid editor data: expected a levels object.')
            return
          }

          for (const [levelId, level] of Object.entries(levels)) {
            if (!/^[a-z0-9_-]+$/i.test(levelId) || !Array.isArray(level.walls) ||
              !level.content || typeof level.content !== 'object' || Array.isArray(level.content)) {
              response.statusCode = 400
              response.end(`Invalid editor data for level "${levelId}".`)
              return
            }
            if (level.walls.length > 2000 || level.walls.some((wall) =>
              !['x', 'y', 'w', 'h'].every((key) => Number.isFinite(wall[key])) ||
              wall.w <= 0 || wall.h <= 0
            )) {
              response.statusCode = 400
              response.end(`Invalid wall data for level "${levelId}".`)
              return
            }

            const content = level.content
            for (const key of ['npcs', 'objects', 'removedNpcIds', 'removedObjectIds', 'removedChallengeIds']) {
              if (content[key] !== undefined && !Array.isArray(content[key])) {
                response.statusCode = 400
                response.end(`Invalid "${key}" data for level "${levelId}".`)
                return
              }
            }
            if ([...(content.removedNpcIds || []), ...(content.removedObjectIds || [])]
              .some((id) => typeof id !== 'string' || !id)) {
              response.statusCode = 400
              response.end(`Invalid removed entity ids for level "${levelId}".`)
              return
            }
            for (const key of ['npcOverrides', 'objectOverrides', 'challengeOverrides']) {
              if (content[key] !== undefined &&
                (!content[key] || typeof content[key] !== 'object' || Array.isArray(content[key]))) {
                response.statusCode = 400
                response.end(`Invalid "${key}" data for level "${levelId}".`)
                return
              }
            }
            for (const key of ['npcOverrides', 'objectOverrides']) {
              if (Object.values(content[key] || {}).some((override) =>
                !override || typeof override !== 'object' || Array.isArray(override) ||
                (override.x !== undefined && !Number.isFinite(override.x)) ||
                (override.y !== undefined && !Number.isFinite(override.y))
              )) {
                response.statusCode = 400
                response.end(`Invalid "${key}" entry for level "${levelId}".`)
                return
              }
            }

            const entities = [...(content.npcs || []), ...(content.objects || [])]
            if (entities.length > 500 || entities.some((entity) =>
              !entity || typeof entity.id !== 'string' || !entity.id ||
              !Number.isFinite(entity.x) || !Number.isFinite(entity.y)
            )) {
              response.statusCode = 400
              response.end(`Invalid entity data for level "${levelId}".`)
              return
            }

            const challengeEntries = Object.entries(content.challengeOverrides || {})
            if (challengeEntries.length > 500 || challengeEntries.some(([, challenge]) =>
              !challenge || typeof challenge.title !== 'string' || !challenge.title.trim() ||
              !Array.isArray(challenge.questions) || challenge.questions.length < 1 ||
              challenge.questions.length > 100 || challenge.questions.some((question) =>
                !question || typeof question.text !== 'string' || !question.text.trim() ||
                !(
                  typeof question.correctExplanation === 'string' && question.correctExplanation.trim() ||
                  typeof question.explanation === 'string' && question.explanation.trim()
                ) ||
                (question.retryExplanation !== undefined &&
                  (typeof question.retryExplanation !== 'string' || !question.retryExplanation.trim())) ||
                !Array.isArray(question.options) || question.options.length < 2 ||
                question.options.length > 10 || question.options.some((option) => typeof option !== 'string' || !option.trim()) ||
                !Number.isInteger(question.correctIndex) ||
                question.correctIndex < 0 || question.correctIndex >= question.options.length ||
                (question.correctIndexes !== undefined &&
                  (!Array.isArray(question.correctIndexes) || question.correctIndexes.length < 1 ||
                    question.correctIndexes.some((index) =>
                      !Number.isInteger(index) || index < 0 || index >= question.options.length
                    ) || new Set(question.correctIndexes).size !== question.correctIndexes.length))
              )
            )) {
              response.statusCode = 400
              response.end(`Invalid challenge data for level "${levelId}".`)
              return
            }
          }

          await writeFile(editorDataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ saved: true }))
        } catch (error) {
          server.config.logger.error(`Could not save editor data: ${error.message}`)
          response.statusCode = 400
          response.end('Could not save project editor data.')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), editorDataPlugin()],
  base: process.env.GITHUB_ACTIONS === 'true' ? '/JOB-QUEST/' : '/',
  server: {
    watch: {
      usePolling: true,
    },
  },
})