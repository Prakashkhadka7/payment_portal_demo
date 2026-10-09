import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService, type PermissionRequirement } from './permission.service';

// Renders its template only when the current user satisfies the permission requirement, and
// updates live when the session changes.
@Directive({ selector: '[appHasPermission]' })
export class HasPermissionDirective {
  readonly appHasPermission = input.required<PermissionRequirement>();
  readonly appHasPermissionElse = input<TemplateRef<unknown> | null>(null);

  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);
  private renderedTemplate: TemplateRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const template = this.permissionService.satisfies(this.appHasPermission())
        ? this.templateRef
        : this.appHasPermissionElse();
      if (template === this.renderedTemplate) {
        return;
      }
      this.viewContainer.clear();
      if (template) {
        this.viewContainer.createEmbeddedView(template);
      }
      this.renderedTemplate = template;
    });
  }
}
