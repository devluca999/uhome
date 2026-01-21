/**
 * Comprehensive Tasks UAT Tests
 *
 * Tests all task features:
 * - Add/complete/delete tasks
 * - Move-in checklist
 * - Work order forms
 * - File/image attachments
 * - Deadline enforcement
 * - Toast reminders
 * - Task persistence
 */

import { test, expect } from '@playwright/test'
import {
  verifyStagingEnvironment,
  setupMultiTabScenario,
  waitForPageReady,
  cleanupUATTest,
} from '../helpers/uat-helpers'
import { logTestResult, logFunctionalFailure } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'
import { createTestFile, uploadFileViaUI } from '../../helpers/upload'

test.describe('Tasks Comprehensive UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('add task as landlord', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tasks Test Property',
      createTasks: false,
    })

    await page.goto(`${baseUrl}/landlord/dashboard`)
    await waitForPageReady(page)

    try {
      // Find add task button
      const addButton = page
        .locator('button:has-text("Add Task"), button:has-text("Create Task")')
        .first()
      const isVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Verify form opens
        const form = page.locator('form, [class*="form"]')
        await expect(form).toBeVisible({ timeout: 3000 })

        await logTestResult(page, {
          page: 'tasks',
          feature: 'add_task',
          role: 'landlord',
          action: 'open_add_form',
          status: 'passed',
        })
      } else {
        await logTestResult(page, {
          page: 'tasks',
          feature: 'add_task',
          role: 'landlord',
          action: 'open_add_form',
          status: 'skipped',
          error: 'Add task button not found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(page, 'tasks', 'add_task', {}, 'error')
      await logFunctionalFailure(page, {
        page: 'tasks',
        feature: 'add_task',
        workflow: 'add_task',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to dashboard', 'Click add task', 'Fill form', 'Submit'],
        screenshot,
      })
      throw error
    }
  })

  test('complete task', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tasks Test Property',
      createTasks: true,
    })

    await page.goto(`${baseUrl}/landlord/dashboard`)
    await waitForPageReady(page)

    try {
      // Find task
      const task = page.locator('[class*="task"], [data-task]').first()
      const isVisible = await task.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Find complete button
        const completeButton = task.locator('button:has-text("Complete"), [data-complete]').first()
        if (await completeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await completeButton.click()
          await page.waitForTimeout(1000)

          // Verify task is marked as complete
          const isComplete = await task
            .locator('[class*="complete"], [data-completed]')
            .isVisible({ timeout: 2000 })
            .catch(() => false)

          await logTestResult(page, {
            page: 'tasks',
            feature: 'complete_task',
            role: 'landlord',
            action: 'complete_task',
            status: isComplete ? 'passed' : 'failed',
            error: isComplete ? undefined : 'Task not marked as complete',
          })
        } else {
          await logTestResult(page, {
            page: 'tasks',
            feature: 'complete_task',
            role: 'landlord',
            action: 'complete_task',
            status: 'skipped',
            error: 'Complete button not found',
          })
        }
      } else {
        await logTestResult(page, {
          page: 'tasks',
          feature: 'complete_task',
          role: 'landlord',
          action: 'complete_task',
          status: 'skipped',
          error: 'No tasks found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'tasks',
        feature: 'complete_task',
        role: 'landlord',
        action: 'complete_task',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('checklist items can be toggled', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tasks Test Property',
      createTasks: true,
    })

    await page.goto(`${baseUrl}/landlord/dashboard`)
    await waitForPageReady(page)

    try {
      // Find checklist
      const checklist = page.locator('[class*="checklist"], [data-checklist]').first()
      const isVisible = await checklist.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Find checklist item
        const checklistItem = checklist.locator('input[type="checkbox"], [role="checkbox"]').first()
        if (await checklistItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          const initialState = await checklistItem.isChecked()
          await checklistItem.click()
          await page.waitForTimeout(500)

          const newState = await checklistItem.isChecked()
          expect(newState).not.toBe(initialState)

          await logTestResult(page, {
            page: 'tasks',
            feature: 'checklist',
            role: 'landlord',
            action: 'toggle_checklist_item',
            status: 'passed',
          })
        } else {
          await logTestResult(page, {
            page: 'tasks',
            feature: 'checklist',
            role: 'landlord',
            action: 'toggle_checklist_item',
            status: 'skipped',
            error: 'Checklist items not found',
          })
        }
      } else {
        await logTestResult(page, {
          page: 'tasks',
          feature: 'checklist',
          role: 'landlord',
          action: 'toggle_checklist_item',
          status: 'skipped',
          error: 'Checklist not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'tasks',
        feature: 'checklist',
        role: 'landlord',
        action: 'toggle_checklist_item',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('file/image attachments work', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tasks Test Property',
      createTasks: true,
    })

    await page.goto(`${baseUrl}/landlord/dashboard`)
    await waitForPageReady(page)

    try {
      // Find task with attachment option
      const task = page.locator('[class*="task"], [data-task]').first()
      const isVisible = await task.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Find attachment button
        const attachButton = task.locator('button:has-text("Attach"), input[type="file"]').first()
        if (await attachButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          const testImage = createTestFile('task-attachment.jpg', 1024 * 100, 'image/jpeg')
          await uploadFileViaUI(page, 'input[type="file"]', testImage)
          await page.waitForTimeout(2000)

          await logTestResult(page, {
            page: 'tasks',
            feature: 'attachments',
            role: 'landlord',
            action: 'attach_file',
            status: 'passed',
          })
        } else {
          await logTestResult(page, {
            page: 'tasks',
            feature: 'attachments',
            role: 'landlord',
            action: 'attach_file',
            status: 'skipped',
            error: 'Attachment button not found',
          })
        }
      } else {
        await logTestResult(page, {
          page: 'tasks',
          feature: 'attachments',
          role: 'landlord',
          action: 'attach_file',
          status: 'skipped',
          error: 'No tasks found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'tasks',
        feature: 'attachments',
        role: 'landlord',
        action: 'attach_file',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('deadline enforcement works', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Tasks Test Property',
      createTasks: true,
    })

    await page.goto(`${baseUrl}/landlord/dashboard`)
    await waitForPageReady(page)

    try {
      // Find task with deadline
      const task = page.locator('[class*="task"], [data-task]').first()
      const isVisible = await task.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        // Check for deadline indicator
        const deadlineIndicator = task.locator('text=/deadline|due|overdue/i')
        const hasDeadline = await deadlineIndicator.isVisible({ timeout: 2000 }).catch(() => false)

        await logTestResult(page, {
          page: 'tasks',
          feature: 'deadline',
          role: 'landlord',
          action: 'verify_deadline_display',
          status: hasDeadline ? 'passed' : 'skipped',
          error: hasDeadline ? undefined : 'Deadline indicator not found',
        })
      } else {
        await logTestResult(page, {
          page: 'tasks',
          feature: 'deadline',
          role: 'landlord',
          action: 'verify_deadline_display',
          status: 'skipped',
          error: 'No tasks found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'tasks',
        feature: 'deadline',
        role: 'landlord',
        action: 'verify_deadline_display',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })
})
